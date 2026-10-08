/*
 * render.js — Dessin de la card avec l'API Canvas 2D.
 * Le même code sert à l'aperçu et à l'export PNG : le canvas est toujours à la
 * résolution d'export, l'aperçu est seulement réduit en CSS.
 * Toutes les valeurs de design viennent de CITS (config.js).
 */
(function (global) {
  'use strict';
  var C = global.CITS;
  var P = C.PALETTE, S = C.STYLE;

  var RAD = Math.PI / 180;
  var bgCache = {};   // fond (dégradé + trame) mis en cache par format
  var logo = { img: null, ready: false, onChange: null };

  /* ================================================================== */
  /* Utilitaires de dessin                                               */
  /* ================================================================== */

  function font(weight, size, family) {
    return weight + ' ' + size + 'px ' + family;
  }

  // Rectangle arrondi (arcTo : compatible avec tous les navigateurs)
  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Forme pleine avec contour entièrement à l'intérieur de (x, y, w, h)
  function boxWithBorder(ctx, x, y, w, h, r, fill, stroke, border) {
    var half = border / 2;
    roundedRect(ctx, x + half, y + half, w - border, h - border, Math.max(0, r - half));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = border;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Texte avec contour épais : strokeText (joints arrondis) puis fillText
  function outlinedText(ctx, text, x, y, fill, outline, lineWidth) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = S.title.miterLimit;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  // Largeur d'un texte avec espacement entre lettres (calcul manuel, identique partout)
  function spacedWidth(ctx, text, spacing) {
    var w = 0, i;
    for (i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width;
    return w + spacing * Math.max(0, text.length - 1);
  }

  // Texte centré avec espacement entre lettres
  function spacedText(ctx, text, cx, y, spacing) {
    var x = cx - spacedWidth(ctx, text, spacing) / 2, i;
    ctx.textAlign = 'left';
    for (i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
  }

  // Taille de police réduite jusqu'à ce que le texte tienne dans maxW
  function fitSize(ctx, text, weight, family, size, minSize, maxW) {
    ctx.font = font(weight, size, family);
    var w = ctx.measureText(text).width;
    if (w <= maxW) return size;
    return Math.max(minSize, Math.floor(size * maxW / w));
  }

  // Tronque avec "…" si le texte dépasse maxW
  function truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var cut = text.length;
    while (cut > 1 && ctx.measureText(text.slice(0, cut).replace(/\s+$/, '') + S.ellipsis).width > maxW) cut--;
    return text.slice(0, cut).replace(/\s+$/, '') + S.ellipsis;
  }

  // Étoile à 4 branches aux côtés concaves
  function star(ctx, x, y, r) {
    var k = r * S.star.pinch;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + k, y - k, x + r, y);
    ctx.quadraticCurveTo(x + k, y + k, x, y + r);
    ctx.quadraticCurveTo(x - k, y + k, x - r, y);
    ctx.quadraticCurveTo(x - k, y - k, x, y - r);
    ctx.closePath();
    ctx.fillStyle = S.star.color;
    ctx.fill();
  }

  // Curseur-flèche blanc à contour encre, pointe en (x, y)
  function cursor(ctx, x, y, scale) {
    var pts = S.cursor.points;
    ctx.beginPath();
    pts.forEach(function (p, i) {
      var px = x + p[0] * scale, py = y + p[1] * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = S.cursor.lineWidth;
    ctx.strokeStyle = S.cursor.stroke;
    ctx.stroke();
    ctx.fillStyle = S.cursor.fill;
    ctx.fill();
  }

  /* ================================================================== */
  /* Fond : dégradé + trame de points (mis en cache)                      */
  /* ================================================================== */

  // Dégradé CSS à 170° : axe orienté selon l'angle, longueur adaptée au rectangle
  function gradientFor(ctx, w, h) {
    var a = S.gradient.angleDeg * RAD;
    var dx = Math.sin(a), dy = -Math.cos(a);
    var len = Math.abs(w * dx) + Math.abs(h * dy);
    var g = ctx.createLinearGradient(w / 2 - dx * len / 2, h / 2 - dy * len / 2,
                                     w / 2 + dx * len / 2, h / 2 + dy * len / 2);
    g.addColorStop(0, S.gradient.from);
    g.addColorStop(1, S.gradient.to);
    return g;
  }

  // Motif d'une cellule de la trame (un point au centre)
  function dotPattern(ctx) {
    var step = S.dots.step;
    var tile = document.createElement('canvas');
    tile.width = tile.height = step;
    var t = tile.getContext('2d');
    t.globalAlpha = S.dots.alpha;
    t.fillStyle = S.dots.color;
    t.beginPath();
    t.arc(step / 2, step / 2, S.dots.radius, 0, Math.PI * 2);
    t.fill();
    return ctx.createPattern(tile, 'repeat');
  }

  function buildBackground(L) {
    var c = document.createElement('canvas');
    c.width = L.width;
    c.height = L.height;
    var ctx = c.getContext('2d');
    ctx.fillStyle = gradientFor(ctx, L.width, L.height);
    ctx.fillRect(0, 0, L.width, L.height);
    ctx.fillStyle = dotPattern(ctx);
    ctx.fillRect(0, 0, L.width, L.height);
    return c;
  }

  function drawBackground(ctx, L) {
    if (!bgCache[L.id]) bgCache[L.id] = buildBackground(L);
    ctx.drawImage(bgCache[L.id], 0, 0);
  }

  /* ================================================================== */
  /* Logo (image officielle, ou repère pointillé en son absence)          */
  /* ================================================================== */

  // Charge la première source valide de EVENT.logoSources
  function loadLogo(onChange) {
    // En file:// : copie intégrée (une image de fichier bloquerait l'export PNG)
    var sources = (global.location.protocol === 'file:' && global.CITS_LOGO_INLINE)
      ? [global.CITS_LOGO_INLINE] : C.EVENT.logoSources.slice();
    logo.onChange = onChange;
    (function tryNext() {
      if (!sources.length) return;
      var el = new Image();
      el.onload = function () { logo.img = el; logo.ready = true; if (logo.onChange) logo.onChange(); };
      el.onerror = tryNext;
      el.src = sources.shift();
    })();
  }

  // Zone logo : image ajustée (contain) en haut à gauche de la zone, sinon repère pointillé
  function drawLogo(ctx, L, T) {
    var b = L.logo;
    if (logo.ready) {
      var k = Math.min(b.w / logo.img.naturalWidth, b.h / logo.img.naturalHeight);
      var w = logo.img.naturalWidth * k, h = logo.img.naturalHeight * k;
      ctx.drawImage(logo.img, b.x, b.y + (b.h - h) / 2, w, h);
      return;
    }
    var lp = S.logoPlaceholder;
    ctx.save();
    ctx.globalAlpha = lp.alpha;
    roundedRect(ctx, b.x + lp.lineWidth / 2, b.y + lp.lineWidth / 2, b.w - lp.lineWidth, b.h - lp.lineWidth, lp.radius);
    ctx.setLineDash(lp.dash);
    ctx.lineWidth = lp.lineWidth;
    ctx.strokeStyle = lp.stroke;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = font(700, lp.size, C.FONTS.body);
    ctx.fillStyle = lp.stroke;
    ctx.textAlign = 'center';
    var y0 = b.y + b.h / 2 - (T.logoPlaceholder.length - 1) * lp.lineHeight / 2 + lp.size * 0.35;
    T.logoPlaceholder.forEach(function (line, i) {
      ctx.fillText(line, b.x + b.w / 2, y0 + i * lp.lineHeight);
    });
    ctx.restore();
  }

  /* ================================================================== */
  /* Blocs de la card                                                     */
  /* ================================================================== */

  function drawHeader(ctx, L, T) {
    drawLogo(ctx, L, T);
    ctx.textAlign = 'right';
    ctx.fillStyle = S.header.dateColor;
    ctx.font = font(800, L.date.size, C.FONTS.heading);
    ctx.fillText(T.date, L.width - L.date.right, L.date.baseline);
    ctx.fillStyle = S.header.placeColor;
    ctx.font = font(400, L.place.size, C.FONTS.body);
    T.place.forEach(function (line, i) {
      ctx.fillText(line, L.width - L.place.right, L.place.baseline + i * L.place.lineHeight);
    });
  }

  function drawTitle(ctx, L, T) {
    var t = L.title, cx = L.width / 2;
    ctx.textAlign = 'center';
    ctx.font = font(800, t.size, C.FONTS.heading);
    outlinedText(ctx, T.titleLine1, cx, t.baseline1, S.title.color1, S.title.outline, t.outline);
    outlinedText(ctx, T.titleLine2, cx, t.baseline2, S.title.color2, S.title.outline, t.outline);
  }

  // Silhouette lilas + indication, affichées tant qu'aucune photo n'est choisie
  function drawPlaceholder(ctx, p, inner, T) {
    var ph = S.photo;
    ctx.fillStyle = ph.innerFill;
    ctx.fillRect(-inner.w / 2, -inner.h / 2, inner.w, inner.h);
    ctx.fillStyle = ph.silhouette;
    ctx.beginPath();
    ctx.arc(0, ph.head.cy * p.h, ph.head.r * p.w, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, ph.body.top * p.h + ph.body.ry * p.h, ph.body.rx * p.w, ph.body.ry * p.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ph.hintColor;
    ctx.font = font(ph.hintWeight, p.hintSize, C.FONTS.body);
    ctx.textAlign = 'center';
    ctx.fillText(T.photoHint, 0, -p.h / 2 + p.hintTop);
  }

  // Cadre photo : rectangle de fond bleu incliné + cadre coloré incliné + contenu rogné
  function drawPhoto(ctx, L, T, st, frameColor) {
    var p = L.photo, inner = photoInner(L);
    ctx.save();
    ctx.translate(p.cx + p.back.dx, p.cy + p.back.dy);
    ctx.rotate(p.back.rotation * RAD);
    roundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, p.radius);
    ctx.fillStyle = P.blue;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(p.rotation * RAD);
    roundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, p.radius);
    ctx.fillStyle = frameColor;
    ctx.fill();
    roundedRect(ctx, -inner.w / 2, -inner.h / 2, inner.w, inner.h, Math.max(0, p.radius - p.border));
    ctx.clip();
    if (C.photo.has()) {
      ctx.fillStyle = S.photo.innerFill;
      ctx.fillRect(-inner.w / 2, -inner.h / 2, inner.w, inner.h);
      C.photo.drawInto(ctx, inner.w, inner.h);
    } else {
      drawPlaceholder(ctx, p, inner, T);
    }
    ctx.restore();
  }

  function drawStars(ctx, L) {
    L.stars.forEach(function (s) { star(ctx, s.x, s.y, s.r); });
  }

  // Taille de la zone visible de la photo (cadre moins la bordure)
  function photoInner(L) {
    return { w: L.photo.w - 2 * L.photo.border, h: L.photo.h - 2 * L.photo.border };
  }

  // Carte blanche : nom (réduit si trop long) et rôle · organisation (tronqué)
  function drawNameCard(ctx, L, T, st) {
    var c = L.card, x = (L.width - c.w) / 2, cx = L.width / 2, maxW = c.w - 2 * c.padX;
    boxWithBorder(ctx, x, c.y, c.w, c.h, c.radius, S.card.fill, S.card.stroke, S.card.border);

    var name = st.name, role = st.role;
    var namePh = !name, rolePh = !role && !name;
    if (namePh) name = T.namePlaceholder;
    if (rolePh) role = T.rolePlaceholder;

    var size = fitSize(ctx, name, 800, C.FONTS.heading, L.name.size, L.name.minSize, maxW);
    ctx.textAlign = 'center';
    ctx.fillStyle = S.card.nameColor;
    ctx.globalAlpha = namePh ? S.card.placeholderAlpha : 1;
    ctx.font = font(800, size, C.FONTS.heading);
    ctx.fillText(truncate(ctx, name, maxW), cx, c.y + (role ? L.name.baseline : L.name.baselineAlone));

    if (role) {
      ctx.globalAlpha = rolePh ? S.card.placeholderAlpha : 1;
      ctx.fillStyle = S.card.roleColor;
      ctx.font = font(500, L.role.size, C.FONTS.body);
      ctx.fillText(truncate(ctx, role, maxW), cx, c.y + L.role.baseline);
    }
    ctx.globalAlpha = 1;
  }

  // Badge en pilule posé sur le bord haut de la carte
  function drawBadge(ctx, L, st) {
    var b = L.badge, type = typeById(st.type);
    var label = st.lang === 'en' ? type.badgeEn : type.badgeFr;
    ctx.font = font(S.badge.weight, b.size, C.FONTS.heading);
    var w = spacedWidth(ctx, label, b.spacing) + 2 * b.padX;
    var x = (L.width - w) / 2, y = L.card.y + b.dy - b.h / 2;
    boxWithBorder(ctx, x, y, w, b.h, b.h / 2, type.fill, S.badge.stroke, S.badge.border);
    ctx.fillStyle = type.text;
    spacedText(ctx, label, L.width / 2, y + b.h / 2 + b.size * 0.36, b.spacing);
  }

  // Deux pastilles chiffres clés, centrées en groupe
  function drawStats(ctx, L, T) {
    var s = L.stats;
    if (!s.show) return;
    var items = [
      { num: C.EVENT.stats.speakers, label: T.statSpeakers },
      { num: C.EVENT.stats.sessions, label: T.statSessions }
    ];
    items.forEach(function (it) {
      ctx.font = font(800, s.numSize, C.FONTS.heading);
      it.numW = ctx.measureText(it.num).width;
      ctx.font = font(S.stats.labelWeight, s.labelSize, C.FONTS.body);
      it.labelW = ctx.measureText(it.label).width;
      it.w = it.numW + s.innerGap + it.labelW + 2 * s.padX;
    });
    var x = (L.width - (items[0].w + items[1].w + s.gap)) / 2;
    items.forEach(function (it) {
      boxWithBorder(ctx, x, s.y, it.w, s.h, s.h / 2, S.stats.fill, S.stats.stroke, S.stats.border);
      var mid = s.y + s.h / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = S.stats.numColor;
      ctx.font = font(800, s.numSize, C.FONTS.heading);
      ctx.fillText(it.num, x + s.padX, mid + s.numSize * 0.36);
      ctx.fillStyle = S.stats.labelColor;
      ctx.font = font(S.stats.labelWeight, s.labelSize, C.FONTS.body);
      ctx.fillText(it.label, x + s.padX + it.numW + s.innerGap, mid + s.labelSize * 0.35);
      x += it.w + s.gap;
    });
  }

  // Bouton jaune d'appel à l'action + curseur qui chevauche son coin bas gauche
  function drawCta(ctx, L, T) {
    var c = L.cta, x = (L.width - c.w) / 2;
    boxWithBorder(ctx, x, c.y, c.w, c.h, c.radius, S.cta.fill, S.cta.stroke, S.cta.border);
    var text = T.ctaPrefix + ' ' + C.EVENT.ticketsUrl;
    var size = fitSize(ctx, text, 800, C.FONTS.heading, c.size, 1, c.w - 2 * c.padX - c.textShiftX);
    ctx.font = font(800, size, C.FONTS.heading);
    ctx.textAlign = 'center';
    ctx.fillStyle = S.cta.textColor;
    ctx.fillText(text, L.width / 2 + c.textShiftX, c.y + c.h / 2 + size * 0.35);
    cursor(ctx, c.cursor.x, c.cursor.y, c.cursor.scale);
  }

  /* ================================================================== */
  /* API publique                                                         */
  /* ================================================================== */

  function typeById(id) {
    return C.TYPES.filter(function (t) { return t.id === id; })[0] || C.TYPES[0];
  }

  function frameColorOf(id) {
    return (C.FRAME_COLORS.filter(function (f) { return f.id === id; })[0] || C.FRAME_COLORS[0]).color;
  }

  // Dessine la card complète à partir de l'état du formulaire
  function draw(ctx, st) {
    var L = C.LAYOUT[st.format], T = C.CARD_TEXT[st.lang];
    ctx.save();
    ctx.clearRect(0, 0, L.width, L.height);
    ctx.textBaseline = 'alphabetic';
    drawBackground(ctx, L);
    drawHeader(ctx, L, T);
    drawTitle(ctx, L, T);
    drawPhoto(ctx, L, T, st, frameColorOf(st.frame));
    drawStars(ctx, L);
    drawNameCard(ctx, L, T, st);
    drawBadge(ctx, L, st);
    drawStats(ctx, L, T);
    drawCta(ctx, L, T);
    ctx.restore();
  }

  // Dimensionne le canvas à la résolution d'export du format
  function resize(canvas, format) {
    var L = C.LAYOUT[format];
    if (canvas.width !== L.width) canvas.width = L.width;
    if (canvas.height !== L.height) canvas.height = L.height;
  }

  C.render = {
    draw: draw,
    resize: resize,
    loadLogo: loadLogo,
    photoInner: function (format) { return photoInner(C.LAYOUT[format]); },
    typeById: typeById
  };
})(window);
