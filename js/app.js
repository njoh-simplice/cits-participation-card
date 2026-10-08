/*
 * app.js — État du formulaire, interface (FR/EN), recadrage à la souris/au doigt,
 * téléchargement, partage et copie de la légende.
 */
(function (global) {
  'use strict';
  var C = global.CITS, LIM = C.LIMITS, RAD = Math.PI / 180;

  var state = {
    uiLang: C.DEFAULTS.uiLang, name: '', role: '', type: C.DEFAULTS.type,
    lang: C.DEFAULTS.lang, frame: C.DEFAULTS.frame, format: C.DEFAULTS.format
  };
  var ready = false;      // vrai quand les polices sont chargées
  var queued = false;     // un rendu est déjà planifié
  var drag = null;        // glissement en cours sur le cadre photo

  function $(id) { return document.getElementById(id); }
  var el = {
    canvas: $('card-canvas'), loading: $('loading'), hint: $('drag-hint'),
    photoInput: $('photo-input'), cameraInput: $('camera-input'), photoLabel: $('photo-label'),
    zoomRow: $('zoom-row'), zoom: $('zoom'), zoomIn: $('zoom-in'), zoomOut: $('zoom-out'),
    remove: $('photo-remove'), photoError: $('photo-error'),
    name: $('name'), nameError: $('name-error'), nameCount: $('name-count'), role: $('role'), roleCount: $('role-count'),
    groupType: $('group-type'), groupLang: $('group-lang'), groupFrame: $('group-frame'), groupFormat: $('group-format'),
    download: $('download'), share: $('share'), needName: $('need-name'),
    caption: $('caption'), copy: $('copy'), status: $('status'), uiLang: $('ui-lang')
  };
  var ctx = el.canvas.getContext('2d');

  /* ================================================================== */
  /* Textes de l'interface                                                */
  /* ================================================================== */

  // Texte de l'interface dans la langue choisie, avec remplacement de {variables}
  function t(key, vars) {
    var s = C.UI[state.uiLang][key] || '';
    Object.keys(vars || {}).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }

  // Applique les textes à tous les éléments marqués data-i18n*
  function applyUiText() {
    document.documentElement.lang = state.uiLang;
    document.title = t('pageTitle');
    each('[data-i18n]', function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    each('[data-i18n-placeholder]', function (n) { n.placeholder = t(n.getAttribute('data-i18n-placeholder')); });
    each('[data-i18n-aria]', function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-aria'))); });
    el.uiLang.setAttribute('aria-label', t('uiLangLabel'));
    each('[data-ui-lang]', function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-ui-lang') === state.uiLang));
    });
    updatePhotoLabel();
    updateCounters();
    updateCanvasLabel();
    updateHint();
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function say(msg) { el.status.textContent = msg; }

  /* ================================================================== */
  /* Groupes de boutons radio (générés depuis config.js)                  */
  /* ================================================================== */

  function radio(name, value, checked, onChange) {
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.addEventListener('change', function () { onChange(value); });
    return input;
  }

  function labelWith(cls, input, children) {
    var label = document.createElement('label');
    label.className = cls;
    label.appendChild(input);
    children.forEach(function (c) { label.appendChild(c); });
    return label;
  }

  function span(cls, text) {
    var s = document.createElement('span');
    if (cls) s.className = cls;
    if (text) s.textContent = text;
    return s;
  }

  function fill(container, nodes) {
    container.textContent = '';
    nodes.forEach(function (n) { container.appendChild(n); });
  }

  function buildTypeGroup() {
    fill(el.groupType, C.TYPES.map(function (ty) {
      var input = radio('type', ty.id, ty.id === state.type, function (v) { state.type = v; changed(); });
      return labelWith('chip', input, [span('chip-text', ty[state.uiLang])]);
    }));
  }

  function buildLangGroup() {
    fill(el.groupLang, ['fr', 'en'].map(function (code) {
      var input = radio('lang', code, code === state.lang, function (v) { state.lang = v; changed(); });
      return labelWith('chip', input, [span('chip-text', code.toUpperCase())]);
    }));
  }

  function buildFrameGroup() {
    fill(el.groupFrame, C.FRAME_COLORS.map(function (fc) {
      var input = radio('frame', fc.id, fc.id === state.frame, function (v) { state.frame = v; changed(); });
      var dot = span('swatch-dot');
      dot.style.background = fc.color;
      return labelWith('swatch', input, [dot, span('swatch-name', fc[state.uiLang])]);
    }));
  }

  function buildFormatGroup() {
    fill(el.groupFormat, C.FORMAT_ORDER.map(function (id) {
      var f = C.LAYOUT[id];
      var input = radio('format', id, id === state.format, function (v) { setFormat(v); });
      var icon = span('format-icon');
      icon.style.setProperty('--r', f.width + ' / ' + f.height);
      var name = f[state.uiLang === 'en' ? 'labelEn' : 'labelFr'] + ' ' + f.ratio;
      return labelWith('format', input, [icon, span('format-name', name), span('format-size', f.width + '×' + f.height)]);
    }));
  }

  function buildGroups() {
    buildTypeGroup(); buildLangGroup(); buildFrameGroup(); buildFormatGroup();
  }

  /* ================================================================== */
  /* Rendu                                                                */
  /* ================================================================== */

  // Regroupe les modifications d'une même image : un seul dessin par frame
  function requestRender() {
    if (!ready || queued) return;
    queued = true;
    global.requestAnimationFrame(function () {
      queued = false;
      C.render.draw(ctx, state);
    });
  }

  // Changement de format : taille du canvas, zone de recadrage, rendu
  function setFormat(format) {
    state.format = format;
    C.render.resize(el.canvas, format);
    var inner = C.render.photoInner(format);
    C.photo.setViewport(inner.w, inner.h);
    requestRender();
  }

  // Mise à jour commune après une modification du formulaire
  function changed() {
    updateCanvasLabel();
    updateCaption();
    el.download.disabled = !state.name;
    el.share.disabled = !state.name;
    el.needName.hidden = !!state.name;
    requestRender();
  }

  function updateCanvasLabel() {
    var type = C.render.typeById(state.type)[state.uiLang];
    el.canvas.setAttribute('aria-label', state.name
      ? t('canvasAltFor', { name: state.name, type: type })
      : t('canvasAlt'));
  }

  function updateCaption() { el.caption.value = C.CAPTIONS[state.lang]; }

  /* ================================================================== */
  /* Champs texte                                                         */
  /* ================================================================== */

  // Espaces superflus supprimés
  function clean(value) { return value.replace(/\s+/g, ' ').trim(); }

  function updateCounters() {
    el.nameCount.textContent = t('charCount', { n: el.name.value.length, max: LIM.nameMax });
    el.roleCount.textContent = t('charCount', { n: el.role.value.length, max: LIM.roleMax });
  }

  function onText() {
    state.name = clean(el.name.value);
    state.role = clean(el.role.value);
    updateCounters();
    if (state.name) checkName();
    changed();
  }

  // Message d'erreur si le nom est resté vide après avoir quitté le champ
  function checkName() {
    var missing = !state.name;
    el.nameError.textContent = missing ? t('errName') : '';
    el.name.setAttribute('aria-invalid', String(missing));
  }

  /* ================================================================== */
  /* Photo : import, erreurs, zoom                                        */
  /* ================================================================== */

  function showPhotoError(msg) { el.photoError.textContent = msg; }

  function errorMessage(code) {
    if (code === 'type') return t('errType');
    if (code === 'size') return t('errSize', { max: LIM.maxFileMB });
    return t('errDecode');
  }

  function updatePhotoLabel() {
    el.photoLabel.textContent = C.photo.has() ? t('changeBtn') : t('chooseBtn');
  }

  function updateHint() {
    el.hint.textContent = C.photo.has() ? t('dragHint') + ' ' + t('dragHintKb') : t('dragHint');
    el.hint.hidden = !C.photo.has();
  }

  // Active ou désactive les contrôles de recadrage selon la présence d'une photo
  function syncPhotoControls() {
    var has = C.photo.has();
    el.zoomRow.hidden = !has;
    el.remove.hidden = !has;
    el.zoom.value = C.photo.zoom();
    el.canvas.classList.toggle('can-drag', has);
    if (has) el.canvas.setAttribute('tabindex', '0'); else el.canvas.removeAttribute('tabindex');
    updatePhotoLabel();
    updateHint();
  }

  function onFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    showPhotoError('');
    C.photo.load(file).then(function () {
      syncPhotoControls();
      say(t('okPhoto'));
      requestRender();
    }, function (err) {
      showPhotoError(errorMessage(err && err.code));
    }).then(function () { input.value = ''; });
  }

  function removePhoto() {
    C.photo.clear();
    showPhotoError('');
    syncPhotoControls();
    say(t('okRemoved'));
    requestRender();
  }

  function setZoom(z) {
    C.photo.setZoom(z);
    el.zoom.value = C.photo.zoom();
    requestRender();
  }

  /* ================================================================== */
  /* Recadrage par glisser (pointer events) et clavier                    */
  /* ================================================================== */

  // Position du pointeur en pixels canvas
  function canvasPoint(e) {
    var r = el.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * el.canvas.width / r.width, y: (e.clientY - r.top) * el.canvas.height / r.height };
  }

  // Rotation d'un vecteur de l'écran vers le repère (incliné) du cadre photo
  function toFrameSpace(dx, dy) {
    var a = C.LAYOUT[state.format].photo.rotation * RAD;
    return { x: dx * Math.cos(a) + dy * Math.sin(a), y: -dx * Math.sin(a) + dy * Math.cos(a) };
  }

  function overFrame(pt) {
    var p = C.LAYOUT[state.format].photo;
    var v = toFrameSpace(pt.x - p.cx, pt.y - p.cy);
    return Math.abs(v.x) <= p.w / 2 && Math.abs(v.y) <= p.h / 2;
  }

  function onPointerDown(e) {
    if (!C.photo.has() || (e.button && e.button !== 0)) return;
    var pt = canvasPoint(e);
    if (!overFrame(pt)) return;
    drag = { id: e.pointerId, x: pt.x, y: pt.y };
    el.canvas.setPointerCapture(e.pointerId);
    el.canvas.classList.add('dragging');
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var pt = canvasPoint(e);
    var v = toFrameSpace(pt.x - drag.x, pt.y - drag.y);
    C.photo.panBy(v.x, v.y);
    drag.x = pt.x;
    drag.y = pt.y;
    requestRender();
  }

  function onPointerEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    el.canvas.classList.remove('dragging');
  }

  // Flèches pour déplacer, + / − pour zoomer
  function onKeyDown(e) {
    if (!C.photo.has()) return;
    var s = LIM.keyboardPanStep, moves = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (moves[e.key]) {
      var v = toFrameSpace(moves[e.key][0], moves[e.key][1]);
      C.photo.panBy(v.x, v.y);
    } else if (e.key === '+' || e.key === '=') {
      C.photo.setZoom(C.photo.zoom() + LIM.zoom.buttonStep);
    } else if (e.key === '-') {
      C.photo.setZoom(C.photo.zoom() - LIM.zoom.buttonStep);
    } else {
      return;
    }
    el.zoom.value = C.photo.zoom();
    e.preventDefault();
    requestRender();
  }

  /* ================================================================== */
  /* Téléchargement, partage, copie                                       */
  /* ================================================================== */

  // Nom de fichier : cits26-prenom-nom.png (minuscules, sans accents ni caractères spéciaux)
  function fileName() {
    var slug = state.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return C.EVENT.shortName.toLowerCase() + '-' + (slug || 'card') + '.png';
  }

  // PNG de l'état courant (dessin immédiat pour être sûr d'exporter la dernière version)
  function exportBlob() {
    return new Promise(function (resolve, reject) {
      C.render.draw(ctx, state);
      try {
        el.canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('export')); }, 'image/png');
      } catch (e) { reject(e); } // SecurityError si le canvas est "tainted"
    });
  }

  function download() {
    if (!state.name) return;
    exportBlob().then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
      say(t('okDownload'));
    }).catch(function (err) {
      say(err && err.name === 'SecurityError' ? t('errTaint') : t('errExport'));
    });
  }

  // Le partage de fichiers n'est proposé que si le navigateur le supporte
  function canShareFiles() {
    try {
      var probe = new File([''], 'x.png', { type: 'image/png' });
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [probe] }));
    } catch (e) { return false; }
  }

  function share() {
    if (!state.name) return;
    exportBlob().then(function (blob) {
      var file = new File([blob], fileName(), { type: 'image/png' });
      return navigator.share({ files: [file], text: C.CAPTIONS[state.lang] });
    }).then(function () { say(t('okShare')); }, function (err) {
      if (err && err.name === 'AbortError') return; // l'utilisateur a fermé la feuille de partage
      say(t('errExport'));
    });
  }

  // Copie dans le presse-papiers, avec repli execCommand pour les contextes non sécurisés
  function copyText(text) {
    if (navigator.clipboard && global.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      el.caption.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
    });
  }

  function copyCaption() {
    copyText(el.caption.value).then(function () {
      el.copy.textContent = t('copied');
      el.copy.classList.add('done');
      say(t('copied'));
      setTimeout(function () { el.copy.textContent = t('copyCaption'); el.copy.classList.remove('done'); }, 2000);
    }, function () { say(t('copyFail')); });
  }

  /* ================================================================== */
  /* Initialisation                                                       */
  /* ================================================================== */

  // Recopie la palette de config.js dans les variables CSS (config.js reste la référence)
  function syncPalette() {
    Object.keys(C.PALETTE).forEach(function (k) {
      document.documentElement.style.setProperty('--' + k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), C.PALETTE[k]);
    });
  }

  // Attend les polices (avec délai maximum) avant le premier rendu
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var loads = C.FONTS.toLoad.map(function (f) { return document.fonts.load(f, C.FONTS.sample); });
    var all = Promise.all(loads).catch(function () {});
    var timeout = new Promise(function (r) { setTimeout(r, C.FONTS.timeoutMs); });
    document.fonts.addEventListener('loadingdone', requestRender); // glyphes chargés plus tard
    return Promise.race([all, timeout]);
  }

  function bindEvents() {
    el.name.addEventListener('input', onText);
    el.name.addEventListener('blur', checkName);
    el.role.addEventListener('input', onText);
    el.photoInput.addEventListener('change', function () { onFile(el.photoInput); });
    el.cameraInput.addEventListener('change', function () { onFile(el.cameraInput); });
    el.remove.addEventListener('click', removePhoto);
    el.zoom.addEventListener('input', function () { setZoom(parseFloat(el.zoom.value)); });
    el.zoomIn.addEventListener('click', function () { setZoom(C.photo.zoom() + LIM.zoom.buttonStep); });
    el.zoomOut.addEventListener('click', function () { setZoom(C.photo.zoom() - LIM.zoom.buttonStep); });
    el.canvas.addEventListener('pointerdown', onPointerDown);
    el.canvas.addEventListener('pointermove', onPointerMove);
    el.canvas.addEventListener('pointerup', onPointerEnd);
    el.canvas.addEventListener('pointercancel', onPointerEnd);
    el.canvas.addEventListener('keydown', onKeyDown);
    el.download.addEventListener('click', download);
    el.share.addEventListener('click', share);
    el.copy.addEventListener('click', copyCaption);
    el.uiLang.addEventListener('click', function (e) {
      var code = e.target.getAttribute && e.target.getAttribute('data-ui-lang');
      if (!code) return;
      state.uiLang = code;
      buildGroups();
      applyUiText();
    });
  }

  // Crédit en pied de page : « Built by » + lien vers le portfolio (données dans config.js)
  function buildCredit() {
    var link = document.createElement('a');
    link.href = C.CREDIT.url;
    link.textContent = C.CREDIT.name;
    link.target = '_blank';
    link.rel = 'noopener';
    $('credit').textContent = C.CREDIT.prefix + ' ';
    $('credit').appendChild(link);
  }

  function init() {
    syncPalette();
    buildCredit();
    el.zoom.min = LIM.zoom.min;
    el.zoom.max = LIM.zoom.max;
    el.zoom.step = LIM.zoom.step;
    el.zoom.value = LIM.zoom.min;
    el.name.maxLength = LIM.nameMax;
    el.role.maxLength = LIM.roleMax;
    el.share.hidden = !canShareFiles();
    buildGroups();
    applyUiText();
    syncPhotoControls();
    updateCaption();
    el.needName.hidden = false;
    bindEvents();
    C.render.loadLogo(requestRender);
    C.render.resize(el.canvas, state.format);
    var inner = C.render.photoInner(state.format);
    C.photo.setViewport(inner.w, inner.h);

    loadFonts().then(function () {
      ready = true;
      el.loading.hidden = true;
      el.canvas.classList.add('ready');
      requestRender();
    });
  }

  init();
})(window);
