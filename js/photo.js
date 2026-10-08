/*
 * photo.js — Import de la photo, orientation EXIF, redimensionnement, recadrage et zoom.
 * La photo reste en mémoire dans le navigateur : aucun envoi, aucune sauvegarde.
 *
 * Modèle de recadrage : la photo "couvre" la zone visible (le cadre intérieur) à zoom = 1.
 * Le point de l'image placé au centre du cadre est (cx, cy), en fractions de 0 à 1.
 */
(function (global) {
  'use strict';
  var L = global.CITS.LIMITS;

  var img = null;        // source dessinable (canvas redimensionné)
  var view = { w: 1, h: 1 }; // taille de la zone visible, en pixels canvas
  var crop = { zoom: 1, cx: 0.5, cy: 0.5 };

  /* ---------- Validation ---------- */

  // Extension du nom de fichier, en minuscules
  function extensionOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  // Le type MIME est parfois vide (certains mobiles) : on se rabat alors sur l'extension
  function isSupported(file) {
    if (file.type) return L.acceptedTypes.indexOf(file.type) !== -1;
    return L.acceptedExt.indexOf(extensionOf(file.name)) !== -1;
  }

  function makeError(code) {
    var e = new Error(code);
    e.code = code;
    return e;
  }

  /* ---------- Décodage ---------- */

  // Décode en respectant l'orientation EXIF ; repli sur <img> si createImageBitmap échoue
  function decode(file) {
    if (global.createImageBitmap) {
      return global.createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () {
        return decodeWithImage(file);
      });
    }
    return decodeWithImage(file);
  }

  // Les navigateurs récents appliquent l'orientation EXIF aux <img> par défaut
  function decodeWithImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var el = new Image();
      el.onload = function () { URL.revokeObjectURL(url); resolve(el); };
      el.onerror = function () { URL.revokeObjectURL(url); reject(makeError('decode')); };
      el.src = url;
    });
  }

  function sourceSize(src) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
  }

  // Réduit les grosses photos : on garde un canvas dont le grand côté ≤ photoMaxSide
  function downscale(src) {
    var s = sourceSize(src);
    var k = Math.min(1, L.photoMaxSide / Math.max(s.w, s.h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(s.w * k));
    c.height = Math.max(1, Math.round(s.h * k));
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close(); // libère l'ImageBitmap
    return c;
  }

  /* ---------- Recadrage ---------- */

  // Échelle image → pixels canvas
  function scale() {
    return Math.max(view.w / img.width, view.h / img.height) * crop.zoom;
  }

  // Garde le centre de recadrage tel que l'image couvre toujours la zone visible
  function clamp() {
    if (!img) return;
    var s = scale();
    var halfX = view.w / s / img.width / 2;
    var halfY = view.h / s / img.height / 2;
    crop.cx = Math.min(1 - halfX, Math.max(halfX, crop.cx));
    crop.cy = Math.min(1 - halfY, Math.max(halfY, crop.cy));
  }

  function resetCrop() {
    crop.zoom = L.zoom.min;
    crop.cx = 0.5;
    crop.cy = 0.5;
  }

  /* ---------- API publique ---------- */

  var photo = {
    has: function () { return !!img; },
    zoom: function () { return crop.zoom; },

    // Charge un fichier ; rejette avec une erreur dont .code vaut 'type', 'size' ou 'decode'
    load: function (file) {
      if (!file || !isSupported(file)) return Promise.reject(makeError('type'));
      if (file.size > L.maxFileMB * 1024 * 1024) return Promise.reject(makeError('size'));
      return decode(file).then(function (src) {
        img = downscale(src);
        resetCrop();
        clamp();
      }, function () { throw makeError('decode'); });
    },

    clear: function () { img = null; resetCrop(); },

    // Taille de la zone visible (cadre intérieur) pour le format courant
    setViewport: function (w, h) { view.w = w; view.h = h; clamp(); },

    setZoom: function (z) {
      crop.zoom = Math.min(L.zoom.max, Math.max(L.zoom.min, z));
      clamp();
    },

    // Déplacement en pixels canvas (le contenu suit le doigt)
    panBy: function (dx, dy) {
      if (!img) return;
      var s = scale();
      crop.cx -= dx / (s * img.width);
      crop.cy -= dy / (s * img.height);
      clamp();
    },

    // Dessine la photo recadrée dans le rectangle centré en (0,0) de taille w × h
    drawInto: function (ctx, w, h) {
      if (!img) return;
      var s = Math.max(w / img.width, h / img.height) * crop.zoom;
      var sw = w / s, sh = h / s;
      var sx = crop.cx * img.width - sw / 2;
      var sy = crop.cy * img.height - sh / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    }
  };

  global.CITS.photo = photo;
})(window);
