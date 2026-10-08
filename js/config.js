/*
 * config.js — Source unique de toutes les valeurs de design, textes et données de l'événement.
 * Rien d'autre dans le projet ne doit contenir de couleur, de taille, de date ou d'URL en dur.
 * Les scripts sont "classiques" (pas de modules) : tout est exposé sous window.CITS.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Couleurs (relevées sur la charte ; ajustez-les ici)                  */
  /* ------------------------------------------------------------------ */
  var PALETTE = {
    violetDeep: '#360050',   // violet profond (site officiel)
    blue: '#2562FF',         // bleu (site officiel)
    yellow: '#FFBB00',       // jaune (site officiel)
    violetNight: '#3E0A66',  // début du dégradé
    violetVivid: '#7A1FD0',  // fin du dégradé
    ink: '#1E0033',          // encre : contours et textes foncés
    lilac: '#F3E8FF',        // fond clair du cadre photo
    textSecondary: '#5B2A78',
    white: '#FFFFFF',
    silhouette: '#CBA6F0',   // silhouette du cadre photo vide
    // Couleurs réservées au cadre photo
    green: '#2FB86B',
    red: '#E5484D',
    violetLight: '#9B3FE8'
  };

  /* ------------------------------------------------------------------ */
  /* Polices (chargées via Google Fonts dans index.html)                  */
  /* ------------------------------------------------------------------ */
  var FONTS = {
    heading: '"Raleway", "Arial Black", Arial, sans-serif',
    body: '"DM Sans", Arial, sans-serif',
    // Variantes à charger explicitement avant le premier rendu (document.fonts.load)
    toLoad: [
      '800 54px "Raleway"',
      '400 28px "DM Sans"',
      '500 28px "DM Sans"',
      '700 28px "DM Sans"'
    ],
    // Texte d'échantillon : force le chargement des glyphes accentués
    sample: 'Prénom NOM Réservez Yaoundé Congrès ÉÈÀÇÔÎ 0123456789 ·…',
    timeoutMs: 4000
  };

  /* ------------------------------------------------------------------ */
  /* Données de l'événement (seul endroit où elles apparaissent)          */
  /* ------------------------------------------------------------------ */
  var EVENT = {
    name: 'Cameroon International Tech Summit',
    shortName: 'CITS26',
    hashtag: '#CITS26',
    ticketsUrl: 'citscm.com/tickets',   // affiché sur la card et dans la légende
    stats: { speakers: '50+', sessions: '90+' },
    logoSources: ['assets/logo-cits.png', 'assets/logo-cits.svg'] // 1re source valide utilisée
  };

  /* ------------------------------------------------------------------ */
  /* Limites et paramètres de la photo                                    */
  /* ------------------------------------------------------------------ */
  var LIMITS = {
    nameMax: 28,
    roleMax: 40,
    maxFileMB: 15,
    photoMaxSide: 2048,                       // grosses photos réduites à ce côté max
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedExt: ['jpg', 'jpeg', 'png', 'webp'],
    zoom: { min: 1, max: 4, step: 0.02, buttonStep: 0.25 },
    keyboardPanStep: 24                       // pixels canvas par appui sur une flèche
  };

  /* ------------------------------------------------------------------ */
  /* Textes de la card (FR / EN)                                          */
  /* ------------------------------------------------------------------ */
  var CARD_TEXT = {
    fr: {
      titleLine1: 'Je serai au',
      titleLine2: 'CITS26 !',
      date: '15-17 oct. 2026',
      place: ['Palais des Congrès,', 'Yaoundé, Cameroun'],
      statSpeakers: 'Intervenants experts',
      statSessions: 'Sessions de conférences',
      ctaPrefix: 'Réservez votre Pass :',
      photoHint: 'Votre photo ici',
      namePlaceholder: 'Prénom NOM',
      rolePlaceholder: 'Votre rôle · Votre organisation',
      logoPlaceholder: ['Logo officiel', 'Cameroon International Tech', 'Summit']
    },
    en: {
      titleLine1: 'I’ll be at',
      titleLine2: 'CITS26!',
      date: 'Oct. 15-17, 2026',
      place: ['Palais des Congrès,', 'Yaoundé, Cameroon'],
      statSpeakers: 'Expert Speakers',
      statSessions: 'Talk Sessions',
      ctaPrefix: 'Get your Pass:',
      photoHint: 'Your photo here',
      namePlaceholder: 'First LAST',
      rolePlaceholder: 'Your role · Your organization',
      logoPlaceholder: ['Official logo', 'Cameroon International Tech', 'Summit']
    }
  };

  /* Légendes prêtes à poster */
  var CAPTIONS = {
    fr: 'Je serai au Cameroon International Tech Summit (CITS26) du 15 au 17 octobre 2026 ' +
        'au Palais des Congrès de Yaoundé ! Et vous ? Réservez votre Pass : ' +
        EVENT.ticketsUrl + ' ' + EVENT.hashtag,
    en: 'I’ll be at the Cameroon International Tech Summit (CITS26) on October 15-17, 2026, ' +
        'at the Palais des Congrès in Yaoundé! Will you? Get your Pass: ' +
        EVENT.ticketsUrl + ' ' + EVENT.hashtag
  };

  /* ------------------------------------------------------------------ */
  /* Types de participation : libellés + couleurs du badge                */
  /* ------------------------------------------------------------------ */
  var TYPES = [
    { id: 'participant',  fr: 'Participant', en: 'Attendee',  badgeFr: 'PARTICIPANT', badgeEn: 'ATTENDEE',
      fill: PALETTE.yellow,     text: PALETTE.violetDeep },
    { id: 'intervenant',  fr: 'Intervenant', en: 'Speaker',   badgeFr: 'INTERVENANT', badgeEn: 'SPEAKER',
      fill: PALETTE.white,      text: PALETTE.violetDeep },
    { id: 'exposant',     fr: 'Exposant',    en: 'Exhibitor', badgeFr: 'EXPOSANT',    badgeEn: 'EXHIBITOR',
      fill: PALETTE.blue,       text: PALETTE.white },
    { id: 'partenaire',   fr: 'Partenaire',  en: 'Partner',   badgeFr: 'PARTENAIRE',  badgeEn: 'PARTNER',
      fill: PALETTE.violetDeep, text: PALETTE.yellow },
    { id: 'volontaire',   fr: 'Volontaire',  en: 'Volunteer', badgeFr: 'VOLONTAIRE',  badgeEn: 'VOLUNTEER',
      fill: PALETTE.lilac,      text: PALETTE.violetDeep }
  ];

  /* Couleurs de cadre photo (4 choix) */
  var FRAME_COLORS = [
    { id: 'yellow',      fr: 'Jaune',        en: 'Yellow',       color: PALETTE.yellow },
    { id: 'green',       fr: 'Vert',         en: 'Green',        color: PALETTE.green },
    { id: 'red',         fr: 'Rouge',        en: 'Red',          color: PALETTE.red },
    { id: 'violetLight', fr: 'Violet clair', en: 'Light purple', color: PALETTE.violetLight }
  ];

  /* ------------------------------------------------------------------ */
  /* Style commun à tous les formats                                      */
  /* ------------------------------------------------------------------ */
  var STYLE = {
    gradient: { angleDeg: 170, from: PALETTE.violetNight, to: PALETTE.violetVivid },
    dots: { radius: 2, step: 18, alpha: 0.14, color: PALETTE.white },
    title: { color1: PALETTE.white, color2: PALETTE.yellow, outline: PALETTE.ink, miterLimit: 2 },
    header: { dateColor: PALETTE.white, placeColor: PALETTE.white },
    logoPlaceholder: { stroke: PALETTE.white, dash: [8, 6], lineWidth: 2, radius: 22, size: 20, lineHeight: 24, alpha: 0.9 },
    photo: {
      innerFill: PALETTE.lilac, hintColor: PALETTE.textSecondary, hintWeight: 700,
      silhouette: PALETTE.silhouette,
      // Proportions de la silhouette, relatives à la taille du cadre (centre = 0,0)
      head: { cy: -0.09, r: 0.183 },
      body: { top: 0.123, rx: 0.36, ry: 0.28 }
    },
    star: { color: PALETTE.yellow, pinch: 0.17 },       // pinch : épaisseur des branches (0 = très fines)
    card: { fill: PALETTE.white, stroke: PALETTE.ink, border: 5, nameColor: PALETTE.violetDeep,
            roleColor: PALETTE.textSecondary, placeholderAlpha: 0.5 },
    badge: { stroke: PALETTE.ink, border: 4, weight: 800 },
    stats: { fill: PALETTE.white, stroke: PALETTE.ink, border: 4, numColor: PALETTE.violetDeep,
             labelColor: PALETTE.ink, labelWeight: 700 },
    cta: { fill: PALETTE.yellow, stroke: PALETTE.ink, border: 5, textColor: PALETTE.violetDeep },
    cursor: {
      fill: PALETTE.white, stroke: PALETTE.ink, lineWidth: 3,
      // Flèche de pointeur : points relatifs à la pointe (0,0)
      points: [[0, 0], [0, 17], [4.4, 13.2], [7.3, 19.6], [10, 18.4], [7.2, 12.2], [12.8, 12.2]]
    },
    ellipsis: '…'
  };

  /* ------------------------------------------------------------------ */
  /* Mise en page par format (toutes les coordonnées en pixels canvas)    */
  /* ------------------------------------------------------------------ */
  var LAYOUT = {
    post: {
      id: 'post', labelFr: 'Post', labelEn: 'Post', ratio: '4:5', width: 1080, height: 1350,
      logo: { x: 64, y: 56, w: 270, h: 96 },
      date: { right: 64, baseline: 91, size: 42 },
      place: { right: 64, baseline: 124, size: 22.5, lineHeight: 29 },
      title: { size: 108, outline: 14, baseline1: 305, baseline2: 413 },
      photo: { cx: 540, cy: 711, w: 440, h: 470, radius: 52, border: 14, rotation: -3,
               back: { dx: 31, dy: 28, rotation: 5 }, hintSize: 22, hintTop: 58 },
      stars: [{ x: 943, y: 540, r: 36 }, { x: 896, y: 607, r: 20 }, { x: 123, y: 803, r: 24 }],
      card: { y: 872, w: 800, h: 172, radius: 40, padX: 40 },
      badge: { size: 22, spacing: 2, padX: 27, h: 44, dy: 2 },
      name: { size: 54, minSize: 28, baseline: 90, baselineAlone: 116 },
      role: { size: 28, baseline: 134 },
      stats: { show: true, y: 1082, h: 65, gap: 27, padX: 28, numSize: 43, labelSize: 20, innerGap: 14 },
      cta: { y: 1201, h: 92, w: 760, radius: 30, size: 33, padX: 36, textShiftX: 13,
             cursor: { x: 147, y: 1270, scale: 2.3 } }
    },
    story: {
      id: 'story', labelFr: 'Story', labelEn: 'Story', ratio: '9:16', width: 1080, height: 1920,
      logo: { x: 64, y: 110, w: 270, h: 96 },
      date: { right: 64, baseline: 148, size: 42 },
      place: { right: 64, baseline: 181, size: 22, lineHeight: 29 },
      title: { size: 112, outline: 14, baseline1: 470, baseline2: 582 },
      photo: { cx: 540, cy: 1010, w: 500, h: 534, radius: 58, border: 15, rotation: -3,
               back: { dx: 40, dy: 34, rotation: 5 }, hintSize: 26, hintTop: 64 },
      stars: [{ x: 960, y: 770, r: 40 }, { x: 910, y: 845, r: 22 }, { x: 110, y: 1120, r: 28 }],
      card: { y: 1200, w: 800, h: 172, radius: 40, padX: 40 },
      badge: { size: 22, spacing: 2, padX: 27, h: 44, dy: 2 },
      name: { size: 54, minSize: 28, baseline: 92, baselineAlone: 116 },
      role: { size: 28, baseline: 134 },
      stats: { show: true, y: 1450, h: 65, gap: 27, padX: 28, numSize: 43, labelSize: 20, innerGap: 14 },
      cta: { y: 1600, h: 92, w: 760, radius: 30, size: 33, padX: 36, textShiftX: 13,
             cursor: { x: 147, y: 1669, scale: 2.3 } }
    },
    square: {
      id: 'square', labelFr: 'Carré', labelEn: 'Square', ratio: '1:1', width: 1080, height: 1080,
      logo: { x: 64, y: 48, w: 270, h: 96 },
      date: { right: 64, baseline: 86, size: 42 },
      place: { right: 64, baseline: 119, size: 22, lineHeight: 29 },
      title: { size: 92, outline: 12, baseline1: 246, baseline2: 338 },
      photo: { cx: 540, cy: 566, w: 330, h: 352, radius: 44, border: 12, rotation: -3,
               back: { dx: 28, dy: 24, rotation: 5 }, hintSize: 20, hintTop: 44 },
      stars: [{ x: 880, y: 420, r: 34 }, { x: 836, y: 478, r: 18 }, { x: 150, y: 640, r: 24 }],
      card: { y: 712, w: 800, h: 160, radius: 40, padX: 40 },
      badge: { size: 22, spacing: 2, padX: 27, h: 44, dy: 2 },
      name: { size: 52, minSize: 28, baseline: 86, baselineAlone: 108 },
      role: { size: 28, baseline: 126 },
      stats: { show: false },
      cta: { y: 938, h: 86, w: 760, radius: 30, size: 33, padX: 36, textShiftX: 13,
             cursor: { x: 147, y: 1000, scale: 2.2 } }
    }
  };
  var FORMAT_ORDER = ['post', 'story', 'square'];

  /* ------------------------------------------------------------------ */
  /* Interface du générateur (FR par défaut, EN au choix)                 */
  /* ------------------------------------------------------------------ */
  var UI = {
    fr: {
      pageTitle: 'Générateur de card de participation · CITS26',
      skip: 'Aller au formulaire',
      uiLangLabel: 'Langue de l’interface',
      title: 'Générez votre card de participation',
      subtitle: 'Importez votre photo, voyez la card se mettre à jour en direct, puis téléchargez-la en PNG pour la partager.',
      previewTitle: 'Aperçu de votre card',
      loading: 'Chargement des polices…',
      canvasAlt: 'Aperçu de votre card de participation au CITS26',
      canvasAltFor: 'Aperçu de la card de {name}, {type}, au CITS26',
      dragHint: 'Glissez la photo dans le cadre pour la recadrer.',
      dragHintKb: 'Clavier : flèches pour déplacer, + et − pour zoomer.',
      f1Label: 'Photo',
      f1Help: 'JPG, PNG ou WebP. Recadrage par glisser et zoom, aperçu en direct.',
      chooseBtn: 'Choisir une photo',
      cameraBtn: 'Prendre un selfie',
      changeBtn: 'Changer de photo',
      zoomLabel: 'Zoom de la photo',
      zoomIn: 'Zoomer',
      zoomOut: 'Dézoomer',
      removeBtn: 'Retirer la photo',
      privacy: 'Votre photo reste sur votre appareil : elle n’est ni envoyée, ni enregistrée.',
      f2Label: 'Prénom et nom',
      f2Placeholder: 'Ex. : Aïcha MBALLA',
      f3Label: 'Rôle · Organisation',
      f3Optional: '(facultatif)',
      f3Placeholder: 'Ex. : Développeuse · Orange Cameroun',
      f4Label: 'Type de participation',
      f5Label: 'Langue de la card',
      f6Label: 'Couleur du cadre',
      f7Label: 'Format d’export',
      charCount: '{n}/{max} caractères',
      download: 'Télécharger ma card',
      downloading: 'Préparation…',
      share: 'Partager',
      needName: 'Saisissez votre prénom et nom pour activer le téléchargement.',
      captionLabel: 'Légende prête à poster',
      copyCaption: 'Copier la légende',
      copied: 'Copié !',
      copyFail: 'Copie impossible : sélectionnez le texte et copiez-le manuellement.',
      errType: 'Fichier non supporté. Choisissez une image JPG, PNG ou WebP.',
      errSize: 'Photo trop lourde (maximum {max} Mo). Choisissez une image plus légère.',
      errDecode: 'Impossible de lire cette image. Essayez une autre photo.',
      errName: 'Le nom est obligatoire.',
      errExport: 'L’export a échoué. Réessayez.',
      errTaint: 'Export bloqué par le navigateur : ouvrez le site via un serveur local (voir le README) plutôt qu’en double-cliquant sur index.html.',
      okPhoto: 'Photo ajoutée.',
      okRemoved: 'Photo retirée.',
      okDownload: 'Votre card est téléchargée.',
      okShare: 'Card partagée.',
      shareText: 'Je serai au CITS26 !',
      footer: 'Cameroon International Tech Summit · 15-17 octobre 2026 · Palais des Congrès, Yaoundé'
    },
    en: {
      pageTitle: 'Participation card generator · CITS26',
      skip: 'Skip to the form',
      uiLangLabel: 'Interface language',
      title: 'Generate your participation card',
      subtitle: 'Import your photo, watch the card update live, then download it as a PNG to share.',
      previewTitle: 'Your card preview',
      loading: 'Loading fonts…',
      canvasAlt: 'Preview of your CITS26 participation card',
      canvasAltFor: 'Preview of {name}’s card, {type}, at CITS26',
      dragHint: 'Drag the photo inside the frame to crop it.',
      dragHintKb: 'Keyboard: arrow keys to move, + and − to zoom.',
      f1Label: 'Photo',
      f1Help: 'JPG, PNG or WebP. Drag to crop, zoom, live preview.',
      chooseBtn: 'Choose a photo',
      cameraBtn: 'Take a selfie',
      changeBtn: 'Change photo',
      zoomLabel: 'Photo zoom',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      removeBtn: 'Remove photo',
      privacy: 'Your photo stays on your device: it is never uploaded or stored.',
      f2Label: 'First and last name',
      f2Placeholder: 'e.g. Aïcha MBALLA',
      f3Label: 'Role · Organization',
      f3Optional: '(optional)',
      f3Placeholder: 'e.g. Developer · Orange Cameroon',
      f4Label: 'Participation type',
      f5Label: 'Card language',
      f6Label: 'Frame color',
      f7Label: 'Export format',
      charCount: '{n}/{max} characters',
      download: 'Download my card',
      downloading: 'Preparing…',
      share: 'Share',
      needName: 'Enter your first and last name to enable the download.',
      captionLabel: 'Ready-to-post caption',
      copyCaption: 'Copy caption',
      copied: 'Copied!',
      copyFail: 'Copy failed: select the text and copy it manually.',
      errType: 'Unsupported file. Please choose a JPG, PNG or WebP image.',
      errSize: 'Photo too large (maximum {max} MB). Please choose a smaller image.',
      errDecode: 'This image cannot be read. Please try another photo.',
      errName: 'The name is required.',
      errExport: 'Export failed. Please try again.',
      errTaint: 'Export blocked by the browser: open the site through a local server (see the README) instead of double-clicking index.html.',
      okPhoto: 'Photo added.',
      okRemoved: 'Photo removed.',
      okDownload: 'Your card has been downloaded.',
      okShare: 'Card shared.',
      shareText: 'I’ll be at CITS26!',
      footer: 'Cameroon International Tech Summit · October 15-17, 2026 · Palais des Congrès, Yaoundé'
    }
  };

  /* État initial du formulaire */
  var DEFAULTS = { uiLang: 'fr', lang: 'fr', type: 'participant', frame: 'yellow', format: 'post' };

  global.CITS = {
    PALETTE: PALETTE, FONTS: FONTS, EVENT: EVENT, LIMITS: LIMITS, CARD_TEXT: CARD_TEXT,
    CAPTIONS: CAPTIONS, TYPES: TYPES, FRAME_COLORS: FRAME_COLORS, STYLE: STYLE,
    LAYOUT: LAYOUT, FORMAT_ORDER: FORMAT_ORDER, UI: UI, DEFAULTS: DEFAULTS
  };
})(window);
