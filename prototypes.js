/* ============================================================
   SQOOL Classe — Interactive Prototype Journeys
   Unified teacher screen + Student screen
   Full-screen, GSAP iPadOS motion
   ============================================================ */
(function () {
  'use strict';

  const stage = document.getElementById('proto-stage');
  if (!stage) return;

  // --- GSAP easing presets (subtle iPadOS motion) ---
  const spring   = 'power3.out';
  const springS  = 'power2.out';
  const smooth   = 'power2.out';
  const iosSnap  = 'power2.inOut';
  const iosSpring = 'power3.out';

  // Custom cubic-bezier(0.86, 0, 0.07, 1) — expo-style, fast attack + smooth settle
  function cubicBezier(x1, y1, x2, y2) {
    // Newton-Raphson solver for cubic bezier
    return function(t) {
      let x = t, i = 0;
      for (; i < 8; i++) {
        const cx = 3*x1*(1-x)*(1-x)*x + 3*x2*(1-x)*x*x + x*x*x - t;
        const dx = 3*x1*(1-x)*(1-3*x) + 3*x2*x*(2-3*x) + 3*x*x;
        if (Math.abs(cx) < 1e-6) break;
        x -= cx / dx;
      }
      return 3*y1*(1-x)*(1-x)*x + 3*y2*(1-x)*x*x + x*x*x;
    };
  }
  const cbEase = cubicBezier(0.86, 0, 0.07, 1);

  // Scenario playback speed (< 1 = slower, 1 = normal)
  const SCENARIO_SPEED = 0.6;

  // --- Screens (unified: single teacher screen + student screen + sessions) ---
  const screens = {
    sessions: document.getElementById('scr-sessions'),
    teacher: document.getElementById('scr-teacher'),
    student: document.getElementById('scr-student'),
  };
  // Backward-compat aliases
  screens.pre = screens.teacher;
  screens.active = screens.teacher;

  // --- TOC ---
  const tocItems = document.querySelectorAll('.proto-toc-item');
  const btnReplay = document.getElementById('proto-toc-replay');
  const cursor = document.getElementById('proto-cursor');

  let currentTL = null;
  let currentProto = null;

  // --- Screen switching (iPadOS page transition) ---
  // Accepts 'sessions', 'teacher', 'student', and legacy 'pre'/'active' (both map to teacher)
  function showScreen(id, instant) {
    const resolvedId = (id === 'pre' || id === 'active') ? 'teacher' : id;
    const uniqueScreens = [screens.sessions, screens.teacher, screens.student].filter(Boolean);
    uniqueScreens.forEach(s => {
      s.classList.remove('active');
      gsap.set(s, { opacity: 0, x: 30, scale: 0.97, pointerEvents: 'none' });
    });
    const scr = screens[resolvedId] || screens.teacher;
    if (instant) {
      gsap.set(scr, { opacity: 1, x: 0, scale: 1, pointerEvents: 'auto' });
    } else {
      gsap.fromTo(scr,
        { opacity: 0, x: 30, scale: 0.97 },
        { opacity: 1, x: 0, scale: 1, duration: 0.55, ease: iosSpring,
          onStart: () => { scr.style.pointerEvents = 'auto'; } }
      );
    }
    scr.classList.add('active');
  }

  // --- Cursor animation (iPadOS pointer) ---
  const viewport = document.getElementById('proto-viewport');
  function moveCursor(target, cb) {
    if (!target || !cursor) { cb?.(); return; }
    const sr = (viewport || stage).getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const tx = tr.left - sr.left + tr.width * 0.55;
    const ty = tr.top - sr.top + tr.height * 0.5;

    const tl = gsap.timeline({ onComplete: cb });
    tl.set(cursor, { left: tx + 40, top: ty + 30, opacity: 0, scale: 0.7 });
    tl.to(cursor, { left: tx, top: ty, opacity: 1, scale: 1, duration: 0.45, ease: smooth });
    tl.to(cursor, { scale: 0.75, duration: 0.08, ease: 'power2.in' });
    tl.to(cursor, { scale: 1, duration: 0.25, ease: iosSpring });
    tl.to(target, { scale: 0.97, duration: 0.08, ease: 'power2.in' }, '-=0.33');
    tl.to(target, { scale: 1, duration: 0.35, ease: iosSpring }, '-=0.25');
    tl.to(cursor, { opacity: 0, scale: 0.9, duration: 0.2, ease: smooth }, '+=0.08');
    return tl;
  }

  // --- Helpers ---
  function staggerReveal(elements, opts = {}) {
    const { delay = 0, stagger = 0.04, from = { y: 8, opacity: 0, scale: 0.97 } } = opts;
    elements.forEach(el => gsap.set(el, from));
    return gsap.to(elements, {
      y: 0, opacity: 1, scale: 1,
      duration: 0.4, stagger, delay, ease: iosSpring,
    });
  }

  // --- Reset helpers ---
  function resetPreScreen() {
    // Reset unified cards to "connecting" state with screens hidden
    const cards = screens.teacher.querySelectorAll('.sc-ucard');
    cards.forEach(c => {
      c.classList.remove('connected', 'selected', 'locked', 'badge-active',
        'border-blue', 'border-green', 'border-red', 'border-purple',
        'has-interaction', 'interaction-question', 'interaction-done', 'interaction-help', 'interaction-understood');
      c.classList.add('connecting', 'no-screen');
      c.style.borderColor = ''; c.style.boxShadow = '';
      gsap.set(c, { opacity: 0, scale: 0.95, y: 5 });
      const badge = c.querySelector('.sc-interaction-badge');
      if (badge) { badge.className = 'sc-interaction-badge hidden'; badge.innerHTML = ''; }
      const avatar = c.querySelector('.sc-ucard-avatar');
      if (avatar) gsap.set(avatar, { clearProps: 'transform,opacity' });
      const screenEl = c.querySelector('.sc-ucard-screen');
      if (screenEl) gsap.set(screenEl, { clearProps: 'transform,opacity' });
      const recv = c.querySelector('.sc-ucard-received');
      if (recv) { recv.classList.add('hidden'); recv.textContent = 'Reçu'; recv.style.background = ''; }
      const status = c.querySelector('.sc-ucard-status');
      if (status) { status.textContent = ''; status.className = 'sc-ucard-status'; status.style.background = ''; status.style.color = ''; }
    });
    const toggle = document.getElementById('p-toggle');
    if (toggle) { toggle.classList.remove('on'); toggle.classList.add('off'); }
    const connCount = screens.teacher.querySelector('.p-conn-count');
    const disconnCount = screens.teacher.querySelector('.p-disconn-count');
    if (connCount) connCount.textContent = '0';
    if (disconnCount) disconnCount.textContent = '24';
    const timerFill = document.getElementById('p-timer-fill');
    if (timerFill) timerFill.style.width = '0%';
    // Hide QR overlay
    const qrOverlay = document.getElementById('p-qr-overlay');
    if (qrOverlay) { qrOverlay.classList.add('hidden'); gsap.set(qrOverlay, { opacity: 0 }); }
    const qrCount = document.getElementById('p-qr-count');
    if (qrCount) qrCount.textContent = '0';
    // Reset show-screens button
    const showScreensBtn = document.getElementById('p-btn-show-screens');
    if (showScreensBtn) showScreensBtn.classList.remove('active');
    // Hide student login/scan overlays
    document.getElementById('p-student-login')?.classList.add('hidden');
    document.getElementById('p-student-qrscan')?.classList.add('hidden');
    document.getElementById('p-qrscan-status')?.classList.add('hidden');
  }

  function resetActiveScreen() {
    // Reset unified cards to active state (with screens visible)
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    ucards.forEach(c => {
      c.classList.remove('locked', 'selected', 'selectable', 'badge-active', 'connecting',
        'no-screen', 'border-blue', 'border-green', 'border-red', 'border-purple');
      c.style.borderColor = ''; c.style.boxShadow = '';
      gsap.set(c, { opacity: 1, y: 0, scale: 1 });
      const badge = c.querySelector('.sc-interaction-badge');
      if (badge) { badge.className = 'sc-interaction-badge hidden'; badge.innerHTML = ''; }
      const recv = c.querySelector('.sc-ucard-received');
      if (recv) { recv.classList.add('hidden'); recv.innerHTML = ''; recv.style.background = ''; }
      const screenContent = c.querySelector('.sc-screen-content');
      const screenOff = c.querySelector('.sc-screen-off');
      if (screenContent) gsap.set(screenContent, { opacity: 1, scale: 1 });
      if (screenOff) gsap.set(screenOff, { opacity: 0 });
      const status = c.querySelector('.sc-ucard-status');
      if (status) { status.style.background = ''; status.style.color = ''; }
    });

    // Reset grid visibility
    const grid = document.getElementById('p-grid');
    if (grid) { grid.classList.remove('hidden'); gsap.set(grid, { opacity: 1 }); }

    // Hide spotlight
    document.getElementById('p-spotlight')?.classList.add('hidden');
    const spotCards = document.getElementById('p-spotlight-cards');
    if (spotCards) spotCards.innerHTML = '';

    // Hide annotation
    document.getElementById('p-annotation-overlay')?.classList.add('hidden');
    const canvas = document.getElementById('p-annotation-canvas');
    if (canvas) canvas.innerHTML = '';

    // Reset messages panel
    document.getElementById('p-messages-panel')?.classList.add('hidden');
    document.getElementById('p-msg-badge')?.classList.add('hidden');

    // Reset badge tooltip
    document.getElementById('p-badge-tooltip')?.classList.add('hidden');

    // Reset student viewer
    const svViewer = document.getElementById('p-student-viewer');
    if (svViewer) { svViewer.classList.add('hidden'); gsap.set(svViewer, { clearProps: 'opacity' }); }
    document.getElementById('p-sv-locked-overlay')?.classList.add('hidden');
    document.getElementById('p-sv-lock')?.classList.remove('locked');

    // Reset all overlays
    ['p-send-overlay','p-project-overlay','p-push-overlay','p-group-overlay',
     'p-poll-overlay','p-reply-overlay','p-recap-overlay','p-scan-overlay','p-timer-overlay'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById('p-send-check')?.classList.add('hidden');

    // Reset poll state
    const pollLaunch = document.getElementById('p-poll-launch');
    if (pollLaunch) { pollLaunch.textContent = 'Envoyer le sondage'; pollLaunch.style.background = ''; }
    document.querySelectorAll('.sc-poll-fill').forEach(f => f.style.width = '0%');
    document.querySelectorAll('.sc-poll-pct').forEach(p => p.textContent = '0%');
    const pollStatus = document.getElementById('p-poll-status');
    if (pollStatus) pollStatus.innerHTML = '<span class="sc-dot green"></span> 0/23 réponses';

    // Reset action panel buttons
    screens.teacher.querySelectorAll('.sc-action-btn').forEach(b => { b.classList.remove('active-btn'); b.classList.remove('sharing'); });

    // Reset sharing bar & student projection banner
    document.getElementById('p-sharing-bar')?.classList.add('hidden');
    document.getElementById('p-student-projection-banner')?.classList.add('hidden');
    document.querySelectorAll('.sc-project-source').forEach(s => s.classList.remove('selected'));

    // Reset group bar
    const groupBar = screens.teacher.querySelector('.sc-group-bar');
    if (groupBar) groupBar.querySelectorAll('.sc-group-pill:not(#p-group-classe)').forEach(p => p.remove());

    // Reset group chip selections
    document.querySelectorAll('.sc-group-chip').forEach(c => c.classList.remove('selected'));

    // Reset lock banners
    screens.teacher.querySelectorAll('.sc-lock-banner-floating').forEach(b => b.remove());

    // Reset timer
    const timerFill = document.getElementById('p-timer-fill');
    if (timerFill) { timerFill.style.width = '0%'; gsap.set(timerFill, { opacity: 1, background: 'linear-gradient(90deg, #007aff, #5ac8fa)' }); }
    const timerDisplay = document.getElementById('p-timer-display');
    if (timerDisplay) { timerDisplay.classList.add('hidden'); timerDisplay.className = 'sc-timer-display hidden'; }
    const studentTimer = document.getElementById('p-student-timer');
    if (studentTimer) studentTimer.classList.add('hidden');
    document.querySelectorAll('.sc-timer-option').forEach(o => o.classList.remove('selected'));

    // Reset scan overlay state
    const scanDoc = document.getElementById('p-scan-doc');
    if (scanDoc) scanDoc.classList.add('hidden');
    const scanLine = document.getElementById('p-scan-line');
    if (scanLine) scanLine.classList.add('hidden');
    const scanSteps = document.getElementById('p-scan-steps');
    if (scanSteps) { scanSteps.classList.add('hidden'); scanSteps.querySelectorAll('.sc-scan-step').forEach(s => s.classList.remove('active', 'done')); }
    const scanProgress = document.getElementById('p-scan-progress');
    if (scanProgress) scanProgress.classList.add('hidden');
    const scanProgressFill = document.getElementById('p-scan-progress-fill');
    if (scanProgressFill) scanProgressFill.style.width = '0%';
    const scanActions = document.getElementById('p-scan-actions');
    if (scanActions) scanActions.classList.add('hidden');

    // Reset recap state
    document.getElementById('p-recap-drive')?.classList.add('hidden');
    document.getElementById('p-recap-disconnect-status')?.classList.add('hidden');
    const disconnBtn = document.getElementById('p-recap-disconnect-btn');
    if (disconnBtn) disconnBtn.classList.remove('active');
    const shutBtn = document.getElementById('p-recap-shutdown-btn');
    if (shutBtn) shutBtn.classList.remove('active');
    const dlAll = document.getElementById('p-recap-dl-all');
    if (dlAll) { dlAll.innerHTML = '<i class="ph ph-download-simple" style="font-size:14px"></i> Tout télécharger'; dlAll.style.color = ''; }
    const relaunchBtn = document.getElementById('p-recap-relaunch');
    if (relaunchBtn) { gsap.set(relaunchBtn, { clearProps: 'all' }); }
    // Reset recap stat values
    const recapStatVals = document.querySelectorAll('.sc-recap-stat-val');
    const recapDefaults = [23, 18, 7, 4];
    recapStatVals.forEach((s, i) => { if (recapDefaults[i] !== undefined) s.textContent = recapDefaults[i]; });
  }

  function resetStudentScreen() {
    screens.student.querySelectorAll('.sc-msg-chip').forEach(c => c.classList.remove('selected'));
    document.getElementById('p-confirm')?.classList.add('hidden');
    const msgPanel = document.getElementById('p-panel-messages');
    if (msgPanel) { msgPanel.style.display = ''; gsap.set(msgPanel, { opacity: 1, scale: 1 }); }
    document.getElementById('p-uploaded-file')?.classList.add('hidden');
    document.getElementById('p-dropped-file')?.classList.add('hidden');
    const uploadProgress = document.getElementById('p-upload-progress');
    if (uploadProgress) uploadProgress.classList.add('hidden');
    const uploadFill = document.getElementById('p-upload-fill');
    if (uploadFill) uploadFill.style.width = '0%';
    const btnSendFile = document.getElementById('p-btn-send-file');
    if (btnSendFile) { btnSendFile.style.display = ''; btnSendFile.disabled = false; }
    const uz = document.getElementById('p-upload-zone');
    if (uz) { uz.classList.remove('drag-over'); uz.style.display = ''; }
    document.getElementById('p-student-lock')?.classList.add('hidden');
    document.getElementById('p-toast')?.classList.add('hidden');
    screens.student.querySelectorAll('.sc-resource').forEach(r => r.classList.remove('highlight'));
    screens.student.querySelectorAll('.sc-resource[data-res="new"]').forEach(r => r.remove());
    const fill = document.getElementById('p-session-fill');
    if (fill) fill.style.width = '0%';
    const resPanel = document.getElementById('p-res-panel');
    if (resPanel) { resPanel.classList.add('hidden'); resPanel.classList.remove('visible'); gsap.set(resPanel, { x: '100%' }); }
    const panels = document.getElementById('p-student-panels');
    if (panels) panels.classList.remove('panel-open');
    screens.student.querySelectorAll('.sc-res-preview').forEach(p => p.classList.add('hidden'));
    document.getElementById('p-res-preview-pdf')?.classList.remove('hidden');
  }

  // --- Resource panel helpers ---
  const resConfig = {
    pdf:   { title: 'Cours_Egypte.pdf',          badge: 'PDF',  badgeClass: '',           previewId: 'p-res-preview-pdf' },
    doc:   { title: 'Exercices.docx',             badge: 'DOC',  badgeClass: 'doc-badge',  previewId: 'p-res-preview-doc' },
    wiki:  { title: 'Wikipedia – Osiris',         badge: 'WEB',  badgeClass: 'link-badge', previewId: 'p-res-preview-wiki' },
    pearl: { title: 'Pearltrees – Égypte antique', badge: 'WEB', badgeClass: 'link-badge', previewId: 'p-res-preview-pearl' },
  };

  function openResPanel(resKey) {
    const config = resConfig[resKey];
    if (!config) return;
    const panel = document.getElementById('p-res-panel');
    const title = document.getElementById('p-res-panel-title');
    const badge = document.getElementById('p-res-panel-badge');
    title.textContent = config.title;
    badge.textContent = config.badge;
    badge.className = 'sc-res-panel-badge ' + config.badgeClass;
    screens.student.querySelectorAll('.sc-res-preview').forEach(p => p.classList.add('hidden'));
    document.getElementById(config.previewId)?.classList.remove('hidden');
    panel.classList.remove('hidden');
    gsap.fromTo(panel, { x: '100%' }, { x: '0%', duration: 0.35, ease: smooth, onStart: () => panel.classList.add('visible') });
  }

  function closeResPanel() {
    const panel = document.getElementById('p-res-panel');
    gsap.to(panel, { x: '100%', duration: 0.25, ease: smooth, onComplete: () => {
      panel.classList.remove('visible');
      panel.classList.add('hidden');
    }});
  }

  function resetAll() {
    if (currentTL) { currentTL.kill(); currentTL = null; }
    gsap.set(cursor, { opacity: 0 });
    // Reset ellipse overlay
    const ell = document.getElementById('ellipse-overlay');
    if (ell) { ell.classList.add('hidden'); gsap.set(ell, { opacity: 0 }); }
    // Reset nav controls
    if (navPrev) navPrev.disabled = true;
    if (navNext) navNext.disabled = true;
    resetPreScreen();
    resetActiveScreen();
    resetStudentScreen();
    // Hide new overlays
    ['p-newsession-overlay','p-assignment-overlay','p-exam-overlay','p-exam-surv-overlay','p-exam-recap-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); gsap.set(el, { opacity: 0 }); }
    });
    // Reset email/drive notifications
    document.getElementById('p-er-drive-notif')?.classList.add('hidden');
    document.getElementById('p-er-email-draft')?.classList.add('hidden');
  }

  // Helper: set up teacher screen with all students visible and active
  function setupActiveScreen() {
    showScreen('teacher', true);
    resetActiveScreen();
    // Make all cards visible (not connecting)
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    ucards.forEach(c => {
      c.classList.remove('connecting');
      gsap.set(c, { opacity: 1, y: 0, scale: 1 });
    });
    // Set timer to 30%
    const tf = document.getElementById('p-timer-fill');
    if (tf) tf.style.width = '30%';
  }

  // ============================================================
  // TEACHER SCENARIOS
  // ============================================================

  // --- T1: Ouvrir la classe ---
  function playT1() {
    resetAll();
    showScreen('teacher');
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const cards = screens.teacher.querySelectorAll('.sc-ucard');
    const connCount = screens.teacher.querySelector('.p-conn-count');
    const disconnCount = screens.teacher.querySelector('.p-disconn-count');
    const qrOverlay = document.getElementById('p-qr-overlay');
    const qrCount = document.getElementById('p-qr-count');

    // Start with no-screen mode (avatar + name + status, no screen preview)
    cards.forEach(c => {
      c.classList.add('no-screen');
      gsap.set(c, { opacity: 0, scale: 0.95 });
    });

    // --- Step 1: Teacher clicks QR Code button ---
    const qrBtn = document.getElementById('p-btn-qr');
    tl.add(() => moveCursor(qrBtn, null));
    tl.add(() => {
      gsap.to(qrBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(qrBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');

    // Show QR overlay (centered modal, quick fade+scale)
    tl.add(() => {
      qrOverlay.classList.remove('hidden');
      gsap.fromTo(qrOverlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: smooth });
      gsap.fromTo(qrOverlay.querySelector('.sc-qr-content'), { scale: 0.96, y: 8 }, { scale: 1, y: 0, duration: 0.25, ease: smooth });
    }, '+=0.15');
    tl.add(() => {}, '+=0.4');

    // --- Step 2: Students scan and join progressively ---
    // Cards appear behind the QR (visible on the grid underneath)
    const connectOrder = [0,4,1,7,3,5,9,6,8,10,11,13,12,14,15,16,17,18,19,20,21,22];
    let connected = 0;

    connectOrder.forEach((idx, i) => {
      tl.add(() => {
        const card = cards[idx];
        if (!card) return;
        card.classList.remove('connecting');
        gsap.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: smooth });
        const status = card.querySelector('.sc-ucard-status');
        if (status) { status.textContent = 'Connecté'; status.className = 'sc-ucard-status connected-status'; }
        connected++;
        connCount.textContent = connected;
        disconnCount.textContent = 24 - connected;
        qrCount.textContent = connected;
      }, i * 0.06 + 0.2);
    });

    // Marius stays disconnected
    tl.add(() => {
      const marius = cards[2];
      if (marius) {
        gsap.to(marius, { opacity: 0.6, scale: 1, y: 0, duration: 0.3 });
        marius.classList.remove('connecting');
        const status = marius.querySelector('.sc-ucard-status');
        if (status) { status.textContent = 'Absent'; status.className = 'sc-ucard-status absent-status'; }
      }
      // Card 23 also absent
      const extra = cards[23];
      if (extra) {
        gsap.to(extra, { opacity: 0.6, scale: 1, y: 0, duration: 0.3 });
        extra.classList.remove('connecting');
        const s2 = extra.querySelector('.sc-ucard-status');
        if (s2) { s2.textContent = 'Absent'; s2.className = 'sc-ucard-status absent-status'; }
      }
      disconnCount.textContent = '2';
      connCount.textContent = '22';
      qrCount.textContent = '22';
    }, '+=0.3');
    tl.add(() => {}, '+=0.8');

    // Late joiner — Marius connects
    tl.add(() => {
      const marius = cards[2];
      if (marius) {
        gsap.to(marius, { opacity: 1, duration: 0.3, ease: smooth });
        const status = marius.querySelector('.sc-ucard-status');
        if (status) { status.textContent = 'Connecté'; status.className = 'sc-ucard-status connected-status'; }
        gsap.fromTo(marius, { scale: 0.97 }, { scale: 1, duration: 0.25, ease: iosSpring });
      }
      connCount.textContent = '23';
      disconnCount.textContent = '1';
      qrCount.textContent = '23';
    });
    tl.add(() => {}, '+=0.5');

    // --- Step 3: Close QR overlay ---
    const qrClose = document.getElementById('p-qr-close');
    tl.add(() => moveCursor(qrClose, null));
    tl.add(() => {
      gsap.to(qrOverlay.querySelector('.sc-qr-content'), { scale: 0.96, y: 8, duration: 0.15, ease: smooth });
      gsap.to(qrOverlay, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => { qrOverlay.classList.add('hidden'); gsap.set(qrOverlay, { clearProps: 'all' }); } });
    }, '+=0.12');

    tl.add(() => {}, '+=1');
  }

  // --- T2: Activer les interactions (show badges on management cards) ---
  function playT2() {
    resetAll();
    showScreen('teacher');

    // Pre-set: all connected, no screens yet (name + status only)
    const preCards = screens.teacher.querySelectorAll('.sc-ucard');
    preCards.forEach(c => {
      c.classList.remove('connecting');
      c.classList.add('no-screen');
      gsap.set(c, { opacity: 1, scale: 1, y: 0 });
      const status = c.querySelector('.sc-ucard-status');
      if (status) { status.textContent = 'Connecté'; status.className = 'sc-ucard-status connected-status'; }
    });
    screens.teacher.querySelector('.p-conn-count').textContent = '23';
    screens.teacher.querySelector('.p-disconn-count').textContent = '1';

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // 1) Cursor clicks toggle
    const toggle = document.getElementById('p-toggle');
    tl.add(() => moveCursor(toggle, null));
    tl.add(() => {
      toggle.classList.remove('off');
      toggle.classList.add('on');
    }, '+=0.2');

    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {}, '+=0.4');

    // Badge type → left border interaction class mapping
    const borderMap = {
      'badge-done': 'interaction-done',
      'badge-question': 'interaction-question',
      'badge-help': 'interaction-help',
      'badge-understood': 'interaction-understood'
    };

    // Interaction badges + colored left borders appear on some students
    const badgeData = [
      { idx: 3, type: 'badge-done', icon: 'ph-fill ph-check-circle', msg: 'J\'ai terminé' },
      { idx: 5, type: 'badge-question', icon: 'ph-fill ph-question', msg: 'J\'ai une question' },
      { idx: 7, type: 'badge-done', icon: 'ph-fill ph-check-circle', msg: 'J\'ai terminé' },
      { idx: 9, type: 'badge-help', icon: 'ph-fill ph-hand-waving', msg: 'Ralentir le rythme' },
      { idx: 0, type: 'badge-understood', icon: 'ph-fill ph-thumbs-up', msg: 'J\'ai compris' },
      { idx: 11, type: 'badge-done', icon: 'ph-fill ph-check-circle', msg: 'J\'ai terminé' },
      { idx: 4, type: 'badge-question', icon: 'ph-fill ph-question', msg: 'J\'ai une question' },
    ];

    badgeData.forEach((bd, i) => {
      tl.add(() => {
        const card = ucards[bd.idx];
        if (!card) return;
        const badge = card.querySelector('.sc-interaction-badge');
        if (!badge) return;
        badge.className = 'sc-interaction-badge ' + bd.type;
        badge.innerHTML = '<i class="' + bd.icon + '" style="font-size:11px"></i>';
        card.classList.add('badge-active', 'has-interaction', borderMap[bd.type]);
        gsap.fromTo(badge,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.25, ease: iosSpring }
        );
      }, i * 0.3 + 0.2);
    });

    tl.add(() => {}, '+=0.8');

    // Cursor hovers over Chloé's card (idx 4) to reveal tooltip
    const chloeCard = ucards[4];
    const tooltip = document.getElementById('p-badge-tooltip');
    const tooltipAvatar = document.getElementById('p-tooltip-avatar');
    const tooltipName = document.getElementById('p-tooltip-name');
    const tooltipTime = document.getElementById('p-tooltip-time');
    const tooltipIcon = document.getElementById('p-tooltip-icon');
    const tooltipText = document.getElementById('p-tooltip-text');
    const tooltipMsg = document.getElementById('p-tooltip-msg');

    tl.add(() => moveCursor(chloeCard, null));

    tl.add(() => {
      // Position tooltip next to Chloé's card
      const cardRect = chloeCard.getBoundingClientRect();
      const parentRect = chloeCard.closest('.proto-screen').getBoundingClientRect();
      const top = cardRect.top - parentRect.top - 10;
      const left = cardRect.right - parentRect.left + 8;

      tooltipAvatar.textContent = 'CD';
      tooltipAvatar.style.background = '#f43f5e';
      tooltipName.textContent = 'Chloé DUPONT';
      tooltipTime.textContent = 'il y a 2 min';
      tooltipIcon.className = 'ph-fill ph-question';
      tooltipIcon.style.fontSize = '14px';
      tooltipText.textContent = 'J\'ai une question';
      tooltipMsg.className = 'sc-badge-tooltip-msg msg-question';

      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
      tooltip.classList.remove('hidden');
      gsap.fromTo(tooltip, { opacity: 0, scale: 0.95, y: 4 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: smooth });
    }, '+=0.15');

    // Hold
    tl.add(() => {}, '+=2.5');

    // Hide tooltip
    tl.add(() => {
      gsap.to(tooltip, { opacity: 0, duration: 0.15, ease: smooth, onComplete: () => tooltip.classList.add('hidden') });
    });

    tl.add(() => {}, '+=1');
  }

  // --- T3: Afficher l'activité sur les écrans (show interaction borders) ---
  function playT3() {
    resetAll();
    showScreen('teacher');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Start with cards visible but no screens (name + status only)
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    ucards.forEach(c => {
      c.classList.remove('connecting');
      c.classList.add('no-screen');
      gsap.set(c, { opacity: 1, scale: 1, y: 0 });
      const status = c.querySelector('.sc-ucard-status');
      if (status) { status.textContent = 'Connecté'; status.className = 'sc-ucard-status connected-status'; }
    });
    const connCount = screens.teacher.querySelector('.p-conn-count');
    const disconnCount = screens.teacher.querySelector('.p-disconn-count');
    if (connCount) connCount.textContent = '23';
    if (disconnCount) disconnCount.textContent = '1';

    tl.add(() => {}, '+=0.5');

    // --- Teacher clicks "Afficher les écrans" ---
    const showScreensBtn = document.getElementById('p-btn-show-screens');
    tl.add(() => moveCursor(showScreensBtn, null));
    tl.add(() => {
      gsap.to(showScreensBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(showScreensBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      showScreensBtn.classList.add('active');
    }, '+=0.15');

    // --- Screen thumbnails appear on each card ---
    tl.add(() => {
      ucards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.remove('no-screen');
          const screenEl = card.querySelector('.sc-ucard-screen');
          if (screenEl) gsap.fromTo(screenEl, { opacity: 0, scaleY: 0.8 }, { opacity: 1, scaleY: 1, duration: 0.25, ease: 'back.out(1.2)', clearProps: 'all' });
          const status = card.querySelector('.sc-ucard-status');
          if (status) { status.textContent = 'Actif'; status.className = 'sc-ucard-status active-status'; }
        }, i * 25);
      });
    }, '+=0.2');

    tl.add(() => {}, '+=2');
  }

  // --- T4: Consulter les messages ---
  function playT4() {
    resetAll();
    setupActiveScreen();

    const panel = document.getElementById('p-messages-panel');
    const msgBtn = document.getElementById('p-btn-messages');
    const msgBadge = document.getElementById('p-msg-badge');

    // Add some badges to unified cards
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    [{ idx: 5, type: 'badge-question' }, { idx: 3, type: 'badge-done' }, { idx: 4, type: 'badge-question' }].forEach(bd => {
      const card = ucards[bd.idx];
      if (!card) return;
      const badge = card.querySelector('.sc-interaction-badge');
      if (badge) {
        badge.className = 'sc-interaction-badge ' + bd.type;
        badge.innerHTML = '<i class="ph-fill ph-' + (bd.type === 'badge-question' ? 'question' : 'check-circle') + '" style="font-size:11px"></i>';
        card.classList.add('badge-active');
      }
    });

    // Show badge on messages button
    if (msgBadge) { msgBadge.classList.remove('hidden'); msgBadge.textContent = '3'; }

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    tl.add(() => {}, '+=0.5');

    // Cursor clicks the messages button in header
    tl.add(() => moveCursor(msgBtn, null));

    // Slide in messages panel with iPadOS spring
    tl.add(() => { openMessagesPanel(); }, '+=0.2');

    tl.add(() => {}, '+=2');

    // Cursor moves to close button, then close panel
    const closeBtn = document.getElementById('p-messages-close');
    tl.add(() => moveCursor(closeBtn, null));
    tl.add(() => {
      closeMessagesPanel(() => { if (msgBadge) msgBadge.classList.add('hidden'); });
    }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // --- T5: Verrouiller les écrans (no full overlay — teacher keeps control) ---
  function playT5() {
    resetAll();
    setupActiveScreen();

    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const lockBtn = document.getElementById('p-btn-lock');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    tl.add(() => {}, '+=0.5');

    // Cursor clicks lock button in action panel
    tl.add(() => moveCursor(lockBtn, null));

    tl.add(() => {
      lockBtn.classList.add('active-btn');
    }, '+=0.12');

    // Unified cards go into locked state one by one (wave effect)
    tl.add(() => {
      ucards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('locked');
          const screenContent = card.querySelector('.sc-screen-content');
          const screenOff = card.querySelector('.sc-screen-off');
          if (screenContent) gsap.to(screenContent, { opacity: 0, scale: 0.95, duration: 0.2 });
          if (screenOff) gsap.to(screenOff, { opacity: 1, duration: 0.2 });
          const status = card.querySelector('.sc-ucard-status');
          if (status) { status.textContent = 'Verrouillé'; status.style.background = '#ff3b30'; status.style.color = '#fff'; }
          gsap.fromTo(card, { scale: 1 }, { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1, ease: smooth });
        }, i * 50);
      });
    }, '+=0.2');

    // Show floating lock banner (not a full overlay)
    tl.add(() => {
      const banner = document.createElement('div');
      banner.className = 'sc-lock-banner-floating';
      banner.innerHTML = '<i class="ph-fill ph-lock-simple" style="font-size:18px"></i> Écrans verrouillés';
      screens.teacher.appendChild(banner);
      gsap.fromTo(banner,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: smooth }
      );
    }, '+=0.6');

    // Hold — teacher can still see everything
    tl.add(() => {}, '+=2');

    // Unlock — cursor clicks lock again
    tl.add(() => moveCursor(lockBtn, null));
    tl.add(() => {
      lockBtn.classList.remove('active-btn');

      // Remove floating banner
      const banner = screens.teacher.querySelector('.sc-lock-banner-floating');
      if (banner) {
        gsap.to(banner, { opacity: 0, scale: 0.9, duration: 0.2, onComplete: () => banner.remove() });
      }

      // Unlock cards
      ucards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.remove('locked');
          const screenContent = card.querySelector('.sc-screen-content');
          const screenOff = card.querySelector('.sc-screen-off');
          if (screenContent) gsap.to(screenContent, { opacity: 1, scale: 1, duration: 0.2 });
          if (screenOff) gsap.to(screenOff, { opacity: 0, duration: 0.2 });
          const status = card.querySelector('.sc-ucard-status');
          if (status) { status.textContent = 'Actif'; status.style.background = ''; status.style.color = ''; status.className = 'sc-ucard-status active-status'; }
        }, i * 40);
      });
    }, '+=0.2');

    tl.add(() => {}, '+=1.5');
  }

  // --- T6: Envoyer une ressource (with card feedback) ---
  function playT6() {
    resetAll();
    setupActiveScreen();

    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const shareDocBtn = document.getElementById('p-btn-share-doc');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks "Partager un document" in action bar
    tl.add(() => moveCursor(shareDocBtn, null));
    tl.add(() => { shareDocBtn.classList.add('active-btn'); }, '+=0.15');

    // Show send overlay
    const overlay = document.getElementById('p-send-overlay');
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-send-modal'),
        { scale: 0.95, y: 20 },
        { scale: 1, y: 0, duration: 0.35, ease: smooth }
      );
    }, '+=0.2');

    // Cursor clicks "Envoyer à la classe"
    const confirmBtn = document.getElementById('p-send-confirm');
    tl.add(() => moveCursor(confirmBtn, null), '+=0.6');

    tl.add(() => {
      gsap.to(confirmBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.08');

    // Checkmark appears
    tl.add(() => {
      const check = document.getElementById('p-send-check');
      check.classList.remove('hidden');
      gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.3, ease: smooth });
    }, '+=0.2');

    // Close modal
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
      shareDocBtn.classList.remove('active-btn');
    }, '+=0.6');

    // Feedback on unified cards — show doc badge on each card
    tl.add(() => {
      showReceivedBadge(ucards, 'pdf', 'Consignes.pdf');
    }, '+=0.3');

    tl.add(() => {}, '+=2.5');
  }

  // Helper: show received-doc badge on cards (bottom-right pastille)
  function showReceivedBadge(cards, type, label) {
    const iconMap = {
      pdf: '<i class="ph ph-file-pdf" style="font-size:10px"></i>',
      doc: '<i class="ph ph-file-doc" style="font-size:10px"></i>',
      link: '<i class="ph ph-link" style="font-size:10px"></i>'
    };
    cards.forEach((card, i) => {
      const recv = card.querySelector('.sc-ucard-received');
      if (!recv) return;
      recv.innerHTML = '<span class="recv-icon ' + type + '">' + (iconMap[type] || iconMap.pdf) + '</span>' + label;
      recv.classList.remove('hidden');
      gsap.fromTo(recv, { opacity: 0, scale: 0.8, y: 4 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, delay: i * 0.025, ease: smooth });
    });
  }

  // Helper: open messages panel with iPadOS spring slide-in
  function openMessagesPanel() {
    const panel = document.getElementById('p-messages-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    gsap.fromTo(panel,
      { x: '100%' },
      { x: '0%', duration: 0.5, ease: cbEase }
    );
  }

  // Helper: close messages panel
  function closeMessagesPanel(onDone) {
    const panel = document.getElementById('p-messages-panel');
    if (!panel) return;
    gsap.to(panel,
      { x: '100%', duration: 0.5, ease: cbEase,
        onComplete: () => { panel.classList.add('hidden'); gsap.set(panel, { clearProps: 'transform' }); if (onDone) onDone(); }
      }
    );
  }

  // Helper: start projection mode (sharing bar + student banner + button state)
  function startProjection(sourceLabel) {
    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    const sharingBar = document.getElementById('p-sharing-bar');
    const studentBanner = document.getElementById('p-student-projection-banner');
    const label = document.getElementById('p-sharing-source-label');

    if (shareScreenBtn) { shareScreenBtn.classList.add('sharing'); shareScreenBtn.querySelector('span').textContent = 'Projection…'; }
    if (label) label.textContent = sourceLabel || 'Écran entier';
    if (sharingBar) { sharingBar.classList.remove('hidden'); gsap.fromTo(sharingBar, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: iosSpring }); }
    if (studentBanner) { studentBanner.classList.remove('hidden'); gsap.fromTo(studentBanner, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth }); }
  }

  // Helper: stop projection mode
  function stopProjection() {
    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    const sharingBar = document.getElementById('p-sharing-bar');
    const studentBanner = document.getElementById('p-student-projection-banner');

    if (sharingBar) gsap.to(sharingBar, { opacity: 0, y: 10, duration: 0.2, ease: smooth, onComplete: () => sharingBar.classList.add('hidden') });
    if (studentBanner) gsap.to(studentBanner, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => studentBanner.classList.add('hidden') });
    if (shareScreenBtn) { shareScreenBtn.classList.remove('sharing'); shareScreenBtn.querySelector('span').textContent = 'Projeter'; }
  }

  // --- T7: Projeter son écran ---
  function playT7() {
    resetAll();
    setupActiveScreen();

    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    const overlay = document.getElementById('p-project-overlay');
    const sharingBar = document.getElementById('p-sharing-bar');
    const studentBanner = document.getElementById('p-student-projection-banner');
    const sourceLabel = document.getElementById('p-sharing-source-label');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // 1. Cursor clicks "Projeter"
    tl.add(() => moveCursor(shareScreenBtn, null));

    // 2. Show source picker modal
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-project-modal'),
        { scale: 0.95, y: 10 },
        { scale: 1, y: 0, duration: 0.3, ease: iosSpring }
      );
    }, '+=0.2');

    tl.add(() => {}, '+=0.6');

    // 3. Cursor selects "Écran entier"
    const screenSource = overlay.querySelector('[data-source="screen"]');
    tl.add(() => moveCursor(screenSource, null));
    tl.add(() => {
      screenSource.classList.add('selected');
    }, '+=0.15');

    tl.add(() => {}, '+=0.4');

    // 4. Close modal, activate sharing mode
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
      startProjection('Écran entier');
    }, '+=0.2');

    // 5. Hold sharing state
    tl.add(() => {}, '+=2.5');

    // 6. Cursor clicks "Arrêter la projection"
    const stopBtn = document.getElementById('p-btn-stop-project');
    tl.add(() => moveCursor(stopBtn, null));
    tl.add(() => { stopProjection(); }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // --- T8: Prendre la main (push resource/app fullscreen to students) ---
  function playT8() {
    resetAll();
    setupActiveScreen();

    const overlay = document.getElementById('p-push-overlay');
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Show push overlay directly (simulating menu action)
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-push-modal'),
        { scale: 0.95, y: 20 },
        { scale: 1, y: 0, duration: 0.35, ease: iosSpring }
      );
    }, '+=0.3');

    // Cursor clicks "Ouvrir un document" option
    const docOption = document.getElementById('p-push-doc');
    tl.add(() => moveCursor(docOption, null), '+=0.5');

    tl.add(() => {
      docOption.classList.add('active');
      gsap.fromTo(docOption, { scale: 0.97 }, { scale: 1, duration: 0.2, ease: smooth });
    }, '+=0.1');

    // Cursor clicks "Envoyer en plein écran"
    const pushConfirm = document.getElementById('p-push-confirm');
    tl.add(() => moveCursor(pushConfirm, null), '+=0.5');

    tl.add(() => {
      gsap.to(pushConfirm, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.08');

    // Close overlay
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
    }, '+=0.2');

    // Cards show "pushed" state — all lock briefly with doc icon
    tl.add(() => {
      ucards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('locked');
          const badge = card.querySelector('.sc-interaction-badge');
          if (badge) {
            badge.className = 'sc-interaction-badge badge-understood';
            badge.innerHTML = '<i class="ph-fill ph-file-doc" style="font-size:11px"></i>';
            gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.2, ease: smooth });
          }
        }, i * 40);
      });
    }, '+=0.2');

    // Hold
    tl.add(() => {}, '+=2.5');

    // Release control
    tl.add(() => {
      ucards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.remove('locked');
          const badge = card.querySelector('.sc-interaction-badge');
          if (badge) {
            badge.className = 'sc-interaction-badge hidden';
            badge.innerHTML = '';
          }
        }, i * 30);
      });
    });

    tl.add(() => {}, '+=1');
  }

  // --- T9: Créer des groupes (drag & drop selection) ---
  function playT9() {
    resetAll();
    setupActiveScreen();

    const createGroupBtn = document.getElementById('p-btn-create-group');
    const overlay = document.getElementById('p-group-overlay');
    const chips = document.querySelectorAll('.sc-group-chip');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks "Créer un groupe"
    tl.add(() => moveCursor(createGroupBtn, null));
    tl.add(() => { createGroupBtn.classList.add('active-btn'); }, '+=0.15');

    // Show group overlay
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-group-modal'),
        { scale: 0.95, y: 20 },
        { scale: 1, y: 0, duration: 0.35, ease: iosSpring }
      );
    }, '+=0.2');

    // Select students one by one
    const selectOrder = [0, 2, 4, 7, 10];
    selectOrder.forEach((idx, i) => {
      tl.add(() => {
        const chip = chips[idx];
        if (!chip) return;
        moveCursor(chip, null);
      }, i === 0 ? '+=0.4' : '+=0.25');

      tl.add(() => {
        const chip = chips[idx];
        if (!chip) return;
        chip.classList.add('selected');
        gsap.fromTo(chip, { scale: 0.95 }, { scale: 1, duration: 0.15, ease: smooth });
      }, '+=0.2');
    });

    // Cursor clicks "Créer le groupe"
    const groupConfirm = document.getElementById('p-group-confirm');
    tl.add(() => moveCursor(groupConfirm, null), '+=0.4');

    tl.add(() => {
      gsap.to(groupConfirm, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.08');

    // Close overlay
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
      createGroupBtn.classList.remove('active-btn');
    }, '+=0.2');

    // New group pill appears in group bar
    tl.add(() => {
      const groupBar = screens.teacher.querySelector('.sc-group-bar');
      const addBtn = document.getElementById('p-btn-group-add');
      const pill = document.createElement('button');
      pill.className = 'sc-group-pill';
      pill.textContent = 'Groupe A';
      groupBar.insertBefore(pill, addBtn);
      gsap.fromTo(pill,
        { opacity: 0, scale: 0.8, x: -10 },
        { opacity: 1, scale: 1, x: 0, duration: 0.3, ease: iosSpring }
      );

      // Highlight selected management cards
      const ucards = screens.teacher.querySelectorAll('.sc-ucard');
      selectOrder.forEach((chipIdx) => {
        const chipStudent = chips[chipIdx]?.dataset.student;
        ucards.forEach(card => {
          if (card.dataset.student === chipStudent) {
            card.classList.add('selected');
            gsap.fromTo(card,
              { boxShadow: '0 0 0 0 rgba(0,122,255,0)' },
              { boxShadow: '0 0 0 2px rgba(0,122,255,.3)', duration: 0.3, ease: smooth }
            );
          }
        });
      });
    }, '+=0.2');

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // STUDENT SCENARIOS
  // ============================================================

  // --- S1: Rejoindre la séance ---
  function playS1() {
    resetAll();
    showScreen('student');
    resetStudentScreen();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // --- Step 1: Show login screen ---
    const loginOverlay = document.getElementById('p-student-login');
    loginOverlay.classList.remove('hidden');
    gsap.set(loginOverlay, { opacity: 1 });

    const loginCard = loginOverlay.querySelector('.sc-login-card');
    gsap.set(loginCard, { opacity: 0, y: 20, scale: 0.95 });
    tl.add(() => {
      gsap.to(loginCard, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => {}, '+=0.5');

    // Focus on user field
    const userField = document.getElementById('p-login-user');
    const userInput = userField.querySelector('.sc-login-input');
    tl.add(() => moveCursor(userInput, null));
    tl.add(() => { userInput.classList.add('focused'); }, '+=0.15');
    tl.add(() => {}, '+=0.3');

    // Focus password field
    const passField = document.getElementById('p-login-pass');
    const passInput = passField.querySelector('.sc-login-input');
    tl.add(() => moveCursor(passInput, null));
    tl.add(() => {
      userInput.classList.remove('focused');
      passInput.classList.add('focused');
    }, '+=0.15');
    tl.add(() => {}, '+=0.3');

    // Click login button
    const loginBtn = document.getElementById('p-login-btn');
    tl.add(() => moveCursor(loginBtn, null));
    tl.add(() => {
      passInput.classList.remove('focused');
      loginBtn.classList.add('loading');
      loginBtn.textContent = 'Connexion...';
    }, '+=0.15');

    // --- Step 2: Transition to QR scan ---
    const qrScan = document.getElementById('p-student-qrscan');
    tl.add(() => {
      gsap.to(loginOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => {
        loginOverlay.classList.add('hidden');
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Se connecter';
      }});
    }, '+=0.6');

    tl.add(() => {
      qrScan.classList.remove('hidden');
      gsap.fromTo(qrScan, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      const scanCard = qrScan.querySelector('.sc-qrscan-card');
      gsap.fromTo(scanCard, { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.2');

    // Scan line animation
    const scanLine = document.getElementById('p-qrscan-line');
    tl.add(() => {
      gsap.fromTo(scanLine, { top: '15%' }, { top: '85%', duration: 1.2, ease: 'none', yoyo: true, repeat: 1 });
    }, '+=0.3');
    tl.add(() => {}, '+=1.5');

    // QR detected — success
    const qrStatus = document.getElementById('p-qrscan-status');
    tl.add(() => {
      qrStatus.classList.remove('hidden');
      gsap.fromTo(qrStatus, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: iosSpring });
    });
    tl.add(() => {}, '+=0.8');

    // --- Step 3: Transition to student session view ---
    tl.add(() => {
      gsap.to(qrScan, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => qrScan.classList.add('hidden') });
    });

    // Set student as connected
    const dot = document.getElementById('p-student-dot');
    const name = document.getElementById('p-student-name');
    tl.add(() => {
      gsap.to(dot, { background: '#22c55e', duration: 0.3 });
      name.textContent = 'Chloé DUPONT – Connectée';
    }, '+=0.3');

    tl.to('#p-session-fill', { width: '5%', duration: 0.8, ease: smooth });

    const panels = screens.student.querySelectorAll('.sc-panel:not(.sc-confirm-panel)');
    panels.forEach(p => gsap.set(p, { opacity: 0, y: 8 }));
    tl.add(() => {
      panels.forEach((p, i) => {
        gsap.to(p, { opacity: 1, y: 0, duration: 0.3, delay: i * 0.08, ease: smooth });
      });
    }, '+=0.25');

    const resources = screens.student.querySelectorAll('.sc-resource');
    resources.forEach(r => gsap.set(r, { opacity: 0, x: -10 }));
    tl.add(() => {
      resources.forEach((r, i) => {
        gsap.to(r, { opacity: 1, x: 0, duration: 0.3, delay: i * 0.1, ease: springS });
      });
    }, '-=0.5');

    tl.add(() => {}, '+=1');
  }

  // --- S2: Consulter les ressources ---
  function playS2() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '35%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const pdfRes = screens.student.querySelector('[data-res="pdf"]');
    tl.add(() => moveCursor(pdfRes, null));
    tl.add(() => { pdfRes.classList.add('highlight'); }, '+=0.1');
    tl.add(() => openResPanel('pdf'), '+=0.25');

    tl.to('#p-session-fill', { width: '42%', duration: 2, ease: smooth }, '+=0.3');
    tl.add(() => {
      const body = document.getElementById('p-res-panel-body');
      if (body) gsap.to(body, { scrollTop: 200, duration: 1.5, ease: smooth });
    }, '-=1.5');

    tl.add(() => { pdfRes.classList.remove('highlight'); closeResPanel(); }, '+=0.5');
    tl.add(() => {}, '+=0.5');

    const wikiRes = screens.student.querySelector('[data-res="wiki"]');
    tl.add(() => moveCursor(wikiRes, null));
    tl.add(() => { wikiRes.classList.add('highlight'); }, '+=0.1');
    tl.add(() => openResPanel('wiki'), '+=0.25');

    tl.to('#p-session-fill', { width: '52%', duration: 1.8, ease: smooth }, '+=0.3');
    tl.add(() => {
      const body = document.getElementById('p-res-panel-body');
      if (body) gsap.to(body, { scrollTop: 150, duration: 1.2, ease: smooth });
    }, '-=1.2');

    tl.add(() => { wikiRes.classList.remove('highlight'); closeResPanel(); }, '+=0.5');
    tl.add(() => {}, '+=0.4');

    const pearlRes = screens.student.querySelector('[data-res="pearl"]');
    tl.add(() => moveCursor(pearlRes, null));
    tl.add(() => { pearlRes.classList.add('highlight'); }, '+=0.1');
    tl.add(() => openResPanel('pearl'), '+=0.25');

    tl.to('#p-session-fill', { width: '62%', duration: 1.5, ease: smooth }, '+=0.3');

    tl.add(() => { pearlRes.classList.remove('highlight'); closeResPanel(); }, '+=0.8');
    tl.add(() => {}, '+=1');
  }

  // --- S3: Envoyer "J'ai terminé" ---
  function playS3() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '85%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const chip = screens.student.querySelector('[data-msg="termine"]');
    tl.add(() => moveCursor(chip, null));
    tl.add(() => { chip.classList.add('selected'); }, '+=0.1');
    tl.add(() => {}, '+=0.3');

    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null));
    tl.to(sendBtn, { scale: 0.96, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.2, ease: smooth });

    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => {
      gsap.to(msgPanel, { opacity: 0, y: -4, duration: 0.2, ease: smooth, onComplete: () => { msgPanel.style.display = 'none'; } });
    }, '+=0.15');
    tl.add(() => {
      confirm.classList.remove('hidden');
      gsap.fromTo(confirm, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.1');
    // Feedback disappears, message panel returns
    tl.add(() => {
      gsap.to(confirm, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => confirm.classList.add('hidden') });
      msgPanel.style.display = '';
      gsap.fromTo(msgPanel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      msgPanel.querySelectorAll('.sc-msg-chip').forEach(c => c.classList.remove('selected'));
    }, '+=2');

    tl.to('#p-session-fill', { width: '100%', duration: 0.8, ease: smooth }, '-=0.2');
    tl.add(() => {}, '+=1.2');
  }

  // --- S4: Poser une question ---
  function playS4() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '40%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const chip = screens.student.querySelector('[data-msg="question"]');
    tl.add(() => moveCursor(chip, null));
    tl.add(() => { chip.classList.add('selected'); }, '+=0.1');
    tl.add(() => {}, '+=0.25');

    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null));
    tl.to(sendBtn, { scale: 0.96, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.2, ease: smooth });

    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => {
      gsap.to(msgPanel, { opacity: 0, y: -4, duration: 0.2, ease: smooth, onComplete: () => { msgPanel.style.display = 'none'; } });
    }, '+=0.15');
    tl.add(() => {
      confirm.classList.remove('hidden');
      gsap.fromTo(confirm, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.1');
    // Feedback disappears, message panel returns
    tl.add(() => {
      gsap.to(confirm, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => confirm.classList.add('hidden') });
      msgPanel.style.display = '';
      gsap.fromTo(msgPanel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      msgPanel.querySelectorAll('.sc-msg-chip').forEach(c => c.classList.remove('selected'));
    }, '+=2');

    tl.add(() => {}, '+=1.2');
  }

  // --- S5: Partager un document (drag → drop → send → progress → confirm) ---
  function playS5() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '60%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const uploadZone = document.getElementById('p-upload-zone');
    const droppedFile = document.getElementById('p-dropped-file');
    const progressBar = document.getElementById('p-upload-progress');
    const progressFill = document.getElementById('p-upload-fill');
    const btnSendFile = document.getElementById('p-btn-send-file');
    const uploaded = document.getElementById('p-uploaded-file');

    tl.add(() => moveCursor(uploadZone, null));

    tl.add(() => {
      uploadZone.classList.add('drag-over');
      gsap.to(uploadZone, { scale: 1.01, duration: 0.25, ease: smooth });
    }, '+=0.15');

    tl.add(() => {
      uploadZone.classList.remove('drag-over');
      gsap.to(uploadZone, { scale: 1, opacity: 0, duration: 0.2, ease: smooth, onComplete: () => { uploadZone.style.display = 'none'; } });
    }, '+=0.4');
    tl.add(() => {
      droppedFile.classList.remove('hidden');
      gsap.fromTo(droppedFile, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.15');

    tl.add(() => moveCursor(btnSendFile, null), '+=0.5');
    tl.add(() => {
      gsap.to(btnSendFile, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.08');

    tl.add(() => {
      btnSendFile.style.display = 'none';
      progressBar.classList.remove('hidden');
    }, '+=0.15');
    tl.to(progressFill, { width: '35%', duration: 0.4, ease: smooth }, '+=0.1');
    tl.to(progressFill, { width: '70%', duration: 0.5, ease: smooth }, '+=0.15');
    tl.to(progressFill, { width: '100%', duration: 0.3, ease: smooth }, '+=0.1');

    tl.add(() => {
      gsap.to(droppedFile, { opacity: 0, y: -4, duration: 0.2, ease: smooth, onComplete: () => droppedFile.classList.add('hidden') });
    }, '+=0.3');
    tl.add(() => {
      uploaded.classList.remove('hidden');
      gsap.fromTo(uploaded, { opacity: 0, y: 6, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: smooth });
    }, '+=0.15');

    tl.to('#p-session-fill', { width: '70%', duration: 0.6, ease: smooth }, '-=0.3');
    tl.add(() => {}, '+=1.2');
  }

  // --- S6: Recevoir une ressource (notification toast) ---
  function playS6() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '45%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Student is working — progress advances
    tl.to('#p-session-fill', { width: '50%', duration: 1.5, ease: smooth });

    // Toast notification slides in
    const toast = document.getElementById('p-toast');
    tl.add(() => {
      toast.classList.remove('hidden');
      gsap.fromTo(toast,
        { y: -30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: iosSpring }
      );
    }, '+=0.3');

    // Hold — notification visible
    tl.add(() => {}, '+=1.5');

    // Insert new resource at top of resource list
    const resList = document.getElementById('p-resource-list');
    let newRes;
    tl.add(() => {
      newRes = document.createElement('div');
      newRes.className = 'sc-resource highlight';
      newRes.setAttribute('data-res', 'new');
      newRes.innerHTML = '<span class="sc-res-icon doc"><i class="ph ph-file-doc" style="font-size:14px"></i></span><span class="sc-res-name">Exercice_approfondissement.docx</span><span class="sc-res-badge-new">Nouveau</span><i class="ph ph-arrow-square-out sc-res-ext"></i>';
      resList.insertBefore(newRes, resList.firstChild);
      gsap.fromTo(newRes, { opacity: 0, y: -8, maxHeight: 0 }, { opacity: 1, y: 0, maxHeight: 60, duration: 0.4, ease: iosSpring });
      gsap.fromTo(newRes,
        { boxShadow: '0 0 0 0 rgba(0,122,255,0)' },
        { boxShadow: '0 0 0 2px rgba(0,122,255,.25)', duration: 0.4, yoyo: true, repeat: 2, ease: smooth, delay: 0.3 }
      );
    }, '+=0.3');

    // Toast fades
    tl.add(() => {
      gsap.to(toast, { y: -20, opacity: 0, duration: 0.3, ease: smooth, onComplete: () => toast.classList.add('hidden') });
    }, '+=1.8');

    tl.add(() => { if (newRes) newRes.classList.remove('highlight'); }, '+=0.5');
    tl.add(() => {}, '+=0.5');
  }

  // --- S7: Écran verrouillé par l'enseignant ---
  function playS7() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '55%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Student is working
    tl.to('#p-session-fill', { width: '58%', duration: 1, ease: smooth });

    // Lock screen appears
    const lock = document.getElementById('p-student-lock');
    tl.add(() => {
      lock.classList.remove('hidden');
      gsap.fromTo(lock,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: smooth }
      );
    }, '+=0.5');

    // Hold — locked state
    tl.add(() => {}, '+=3');

    // Unlock
    tl.add(() => {
      gsap.to(lock, { opacity: 0, duration: 0.4, ease: smooth, onComplete: () => lock.classList.add('hidden') });
    });

    // Toast: "L'enseignant a déverrouillé votre écran"
    const toast = document.getElementById('p-toast');
    tl.add(() => {
      toast.querySelector('span:nth-child(2)').textContent = 'Votre écran a été déverrouillé';
      toast.querySelector('.sc-res-icon')?.remove();
      toast.classList.remove('hidden');
      gsap.fromTo(toast, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: iosSpring });
    }, '+=0.3');

    tl.add(() => {
      gsap.to(toast, { y: -20, opacity: 0, duration: 0.3, ease: smooth, onComplete: () => toast.classList.add('hidden') });
    }, '+=2');

    tl.add(() => {}, '+=0.5');
  }

  // ============================================================
  // NEW TEACHER PROTOTYPES
  // ============================================================

  // --- T10: Lancer un sondage ---
  function playT10() {
    resetAll();
    setupActiveScreen();

    const overlay = document.getElementById('p-poll-overlay');
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Show poll overlay
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-poll-modal'),
        { scale: 0.95, y: 20 },
        { scale: 1, y: 0, duration: 0.35, ease: iosSpring }
      );
    }, '+=0.3');

    // Cursor clicks "Envoyer le sondage"
    const launchBtn = document.getElementById('p-poll-launch');
    tl.add(() => moveCursor(launchBtn, null), '+=0.6');
    tl.add(() => {
      gsap.to(launchBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
      launchBtn.textContent = 'Sondage envoyé';
      launchBtn.style.background = '#34c759';
    }, '+=0.1');

    // Responses come in — bars fill up
    const options = overlay.querySelectorAll('.sc-poll-option');
    const statusEl = document.getElementById('p-poll-status');

    // Wave 1: 8 responses
    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 8/23 réponses';
      const fills = overlay.querySelectorAll('.sc-poll-fill');
      const pcts = overlay.querySelectorAll('.sc-poll-pct');
      gsap.to(fills[0], { width: '50%', duration: 0.6, ease: smooth }); pcts[0].textContent = '50%';
      gsap.to(fills[1], { width: '30%', duration: 0.6, ease: smooth }); pcts[1].textContent = '25%';
      gsap.to(fills[2], { width: '20%', duration: 0.6, ease: smooth }); pcts[2].textContent = '25%';
    }, '+=0.8');

    // Wave 2: 18 responses
    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 18/23 réponses';
      const fills = overlay.querySelectorAll('.sc-poll-fill');
      const pcts = overlay.querySelectorAll('.sc-poll-pct');
      gsap.to(fills[0], { width: '65%', duration: 0.6, ease: smooth }); pcts[0].textContent = '56%';
      gsap.to(fills[1], { width: '45%', duration: 0.6, ease: smooth }); pcts[1].textContent = '28%';
      gsap.to(fills[2], { width: '25%', duration: 0.6, ease: smooth }); pcts[2].textContent = '16%';
    }, '+=1');

    // Wave 3: 23 responses
    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 23/23 réponses';
      const fills = overlay.querySelectorAll('.sc-poll-fill');
      const pcts = overlay.querySelectorAll('.sc-poll-pct');
      gsap.to(fills[0], { width: '70%', duration: 0.6, ease: smooth }); pcts[0].textContent = '52%';
      gsap.to(fills[1], { width: '50%', duration: 0.6, ease: smooth }); pcts[1].textContent = '30%';
      gsap.to(fills[2], { width: '30%', duration: 0.6, ease: smooth }); pcts[2].textContent = '18%';
    }, '+=0.8');

    tl.add(() => {}, '+=2');

    // Close
    const closeBtn = document.getElementById('p-poll-close');
    tl.add(() => moveCursor(closeBtn, null));
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => {
        overlay.classList.add('hidden');
        // Reset poll state
        launchBtn.textContent = 'Envoyer le sondage';
        launchBtn.style.background = '';
        overlay.querySelectorAll('.sc-poll-fill').forEach(f => f.style.width = '0%');
        overlay.querySelectorAll('.sc-poll-pct').forEach(p => p.textContent = '0%');
        statusEl.innerHTML = '<span class="sc-dot green"></span> 0/23 réponses';
      }});
    }, '+=0.15');

    tl.add(() => {}, '+=0.5');
  }

  // --- T11: Répondre à un élève ---
  function playT11() {
    resetAll();
    setupActiveScreen();

    const panel = document.getElementById('p-messages-panel');
    const msgBtn = document.getElementById('p-btn-messages');
    const msgBadge = document.getElementById('p-msg-badge');
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');

    // Show badge on Ravi's card
    const raviCard = ucards[9]; // Ravi Singh
    if (raviCard) {
      const badge = raviCard.querySelector('.sc-interaction-badge');
      if (badge) {
        badge.className = 'sc-interaction-badge badge-question';
        badge.innerHTML = '<i class="ph-fill ph-question" style="font-size:11px"></i>';
        raviCard.classList.add('badge-active');
      }
    }
    if (msgBadge) { msgBadge.classList.remove('hidden'); msgBadge.textContent = '1'; }

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks messages button in header
    tl.add(() => moveCursor(msgBtn, null));

    // Slide in messages panel with iPadOS spring
    tl.add(() => { openMessagesPanel(); }, '+=0.2');

    tl.add(() => {}, '+=0.5');

    // Cursor clicks on Ravi's message row
    const raviMsg = document.getElementById('p-msg-ravi');
    tl.add(() => moveCursor(raviMsg, null));

    // Show reply overlay
    const replyOverlay = document.getElementById('p-reply-overlay');
    tl.add(() => {
      replyOverlay.classList.remove('hidden');
      gsap.fromTo(replyOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(replyOverlay.querySelector('.sc-reply-modal'),
        { scale: 0.95, y: 15 },
        { scale: 1, y: 0, duration: 0.35, ease: iosSpring }
      );
    }, '+=0.2');

    tl.add(() => {}, '+=0.8');

    // Cursor clicks send reply
    const replySend = document.getElementById('p-reply-send');
    tl.add(() => moveCursor(replySend, null));
    tl.add(() => {
      gsap.to(replySend, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.08');

    // Close reply overlay
    tl.add(() => {
      gsap.to(replyOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => replyOverlay.classList.add('hidden') });
    }, '+=0.2');

    // Badge on Ravi's card changes to "understood"
    tl.add(() => {
      if (raviCard) {
        const badge = raviCard.querySelector('.sc-interaction-badge');
        if (badge) {
          badge.className = 'sc-interaction-badge badge-understood';
          badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>';
          gsap.fromTo(badge, { scale: 0.5 }, { scale: 1, duration: 0.25, ease: iosSpring });
        }
      }
    }, '+=0.3');

    // Cursor moves to close button, then close panel
    const closeBtn = document.getElementById('p-messages-close');
    tl.add(() => moveCursor(closeBtn, null), '+=0.8');
    tl.add(() => { closeMessagesPanel(); }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // T12: Mettre 3 écrans en avant (spotlight 3 students)
  // ============================================================
  function playT12() {
    resetAll();
    setupActiveScreen();
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Select 3 students
    const selectIndices = [4, 6, 9]; // Chloé, Lucas, Ravi
    selectIndices.forEach((idx, i) => {
      tl.add(() => {
        moveCursor(ucards[idx], null);
      }, i === 0 ? '+=0.3' : '+=0.4');
      tl.add(() => {
        ucards[idx].classList.add('selected');
        gsap.fromTo(ucards[idx], { scale: 0.96 }, { scale: 1, duration: 0.2, ease: iosSpring });
      }, '+=0.15');
    });

    tl.add(() => {}, '+=0.5');

    // Show spotlight view
    const grid = document.getElementById('p-grid');
    const spotlight = document.getElementById('p-spotlight');
    const spotCards = document.getElementById('p-spotlight-cards');

    tl.add(() => {
      gsap.to(grid, { opacity: 0, scale: 0.97, duration: 0.3, ease: smooth });
    });
    tl.add(() => {
      grid.classList.add('hidden');
      spotlight.classList.remove('hidden');
      // Clone selected cards into 2-column spotlight grid
      selectIndices.forEach(idx => {
        const clone = ucards[idx].cloneNode(true);
        clone.classList.remove('selected');
        clone.style.opacity = '0';
        spotCards.appendChild(clone);
      });
      // Add placeholder 4th slot
      const placeholder = document.createElement('div');
      placeholder.className = 'sc-spotlight-placeholder';
      placeholder.innerHTML = '<div class="sc-spotlight-placeholder-icon"><i class="ph ph-monitor" style="font-size:18px"></i></div><button class="sc-spotlight-placeholder-btn"><i class="ph ph-plus" style="font-size:12px"></i> Afficher un autre écran</button>';
      spotCards.appendChild(placeholder);

      gsap.fromTo(spotlight, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      const spotClones = spotCards.querySelectorAll('.sc-ucard');
      spotClones.forEach((c, i) => {
        gsap.fromTo(c, { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, delay: i * 0.08, ease: iosSpring });
      });
      gsap.fromTo(placeholder, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.3, ease: smooth });
    }, '+=0.2');

    tl.add(() => {}, '+=1.5');

    // Project to video projector
    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    tl.add(() => moveCursor(shareScreenBtn, null));
    tl.add(() => { startProjection('3 écrans élèves'); }, '+=0.15');

    tl.add(() => {}, '+=2.5');

    // Stop projection
    const stopBtn = document.getElementById('p-btn-stop-project');
    tl.add(() => moveCursor(stopBtn, null));
    tl.add(() => { stopProjection(); }, '+=0.15');

    // Return to grid
    const closeBtn = document.getElementById('p-spotlight-close');
    tl.add(() => moveCursor(closeBtn, null), '+=0.5');
    tl.add(() => {
      gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => {
        spotlight.classList.add('hidden');
        spotCards.innerHTML = '';
      }});
      grid.classList.remove('hidden');
      gsap.fromTo(grid, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.3, ease: smooth });
      ucards.forEach(c => c.classList.remove('selected'));
    }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // T13: Annoter un devoir projeté (spotlight one + annotate)
  // ============================================================
  function playT13() {
    resetAll();
    setupActiveScreen();
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Select Chloé's card
    const chloeIdx = 4;
    tl.add(() => moveCursor(ucards[chloeIdx], null), '+=0.3');
    tl.add(() => { ucards[chloeIdx].classList.add('selected'); }, '+=0.15');

    // Show spotlight with just Chloé's screen enlarged
    const grid = document.getElementById('p-grid');
    const spotlight = document.getElementById('p-spotlight');
    const spotCards = document.getElementById('p-spotlight-cards');

    tl.add(() => {
      gsap.to(grid, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => grid.classList.add('hidden') });
    }, '+=0.3');
    tl.add(() => {
      spotlight.classList.remove('hidden');
      const clone = ucards[chloeIdx].cloneNode(true);
      clone.classList.remove('selected');
      clone.style.width = '320px';
      spotCards.appendChild(clone);
      gsap.fromTo(spotlight, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      gsap.fromTo(clone, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: iosSpring });
    }, '+=0.2');

    tl.add(() => {}, '+=1');

    // Project
    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    tl.add(() => moveCursor(shareScreenBtn, null));
    tl.add(() => { startProjection('Écran de Chloé'); }, '+=0.15');
    tl.add(() => {}, '+=1');

    // Open annotation (projection stays active);

    const annotOverlay = document.getElementById('p-annotation-overlay');
    const canvas = document.getElementById('p-annotation-canvas');
    tl.add(() => {
      annotOverlay.classList.remove('hidden');
      gsap.fromTo(annotOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
    }, '+=0.3');

    // Simulate pen annotations
    const annotations = [
      { d: 'M 150 180 Q 200 160 250 185 Q 300 210 350 175', color: '#ff3b30', delay: 0.3 },
      { d: 'M 100 250 L 400 250', color: '#ff3b30', delay: 0.8 },
      { d: 'M 500 120 Q 520 100 560 110 Q 600 120 580 140 Q 560 160 520 150 Q 500 140 500 120', color: '#007aff', delay: 0.5 },
    ];

    annotations.forEach(ann => {
      tl.add(() => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ann.d);
        path.setAttribute('stroke', ann.color);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        const length = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        canvas.appendChild(path);
        gsap.to(path, { strokeDashoffset: 0, duration: 0.6, ease: smooth });
      }, '+=' + ann.delay);
    });

    tl.add(() => {}, '+=2');

    // Close annotation
    const annotClose = document.getElementById('p-annot-close');
    tl.add(() => moveCursor(annotClose, null));
    tl.add(() => {
      gsap.to(annotOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => { annotOverlay.classList.add('hidden'); canvas.innerHTML = ''; } });
      shareScreenBtn.classList.remove('active-btn');
      gsap.to(spotlight, { opacity: 0, duration: 0.3, onComplete: () => { spotlight.classList.add('hidden'); spotCards.innerHTML = ''; }});
      grid.classList.remove('hidden');
      gsap.fromTo(grid, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      ucards[chloeIdx].classList.remove('selected');
    }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // T14: Scanner et envoyer un document
  // ============================================================
  function playT14() {
    resetAll();
    setupActiveScreen();
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Click scan button
    const scanBtn = document.getElementById('p-btn-scan');
    tl.add(() => moveCursor(scanBtn, null), '+=0.3');
    tl.add(() => { scanBtn.classList.add('active-btn'); }, '+=0.12');

    // Show scan overlay
    const scanOverlay = document.getElementById('p-scan-overlay');
    tl.add(() => {
      scanOverlay.classList.remove('hidden');
      gsap.fromTo(scanOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      gsap.fromTo(scanOverlay.querySelector('.sc-scan-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.2');
    tl.add(() => {}, '+=0.8');

    // Take photo (click capture button)
    const captureBtn = document.getElementById('p-scan-capture');
    tl.add(() => moveCursor(captureBtn, null));
    tl.add(() => {
      gsap.to(captureBtn, { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 });
      // Flash effect
      gsap.fromTo(scanOverlay.querySelector('.sc-scan-viewfinder'),
        { background: '#fff' }, { background: '#0f172a', duration: 0.3, ease: smooth });
    }, '+=0.1');

    // Show captured document
    const scanDoc = document.getElementById('p-scan-doc');
    tl.add(() => {
      scanDoc.classList.remove('hidden');
      gsap.fromTo(scanDoc, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.35, ease: iosSpring });
    }, '+=0.3');

    // Show processing steps
    const scanSteps = document.getElementById('p-scan-steps');
    const scanProgress = document.getElementById('p-scan-progress');
    const scanFill = document.getElementById('p-scan-progress-fill');
    const steps = scanSteps.querySelectorAll('.sc-scan-step');

    tl.add(() => {
      scanSteps.classList.remove('hidden');
      scanProgress.classList.remove('hidden');
      gsap.fromTo(scanSteps, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.5');

    // Step 1: Crop
    tl.add(() => { steps[0].classList.add('active'); gsap.to(scanFill, { width: '25%', duration: 0.5, ease: smooth }); }, '+=0.3');
    tl.add(() => { steps[0].classList.remove('active'); steps[0].classList.add('done'); }, '+=0.6');

    // Step 2: Perspective
    tl.add(() => {
      steps[1].classList.add('active');
      gsap.to(scanFill, { width: '50%', duration: 0.5, ease: smooth });
      gsap.to(scanDoc, { skewX: 0, skewY: 0, duration: 0.4, ease: smooth }); // simulate perspective correction
    }, '+=0.1');
    tl.add(() => { steps[1].classList.remove('active'); steps[1].classList.add('done'); }, '+=0.6');

    // Step 3: Enhance/digitize
    const scanLine = document.getElementById('p-scan-line');
    tl.add(() => {
      steps[2].classList.add('active');
      gsap.to(scanFill, { width: '75%', duration: 0.5, ease: smooth });
      scanLine.classList.remove('hidden');
      gsap.fromTo(scanLine, { top: '0%' }, { top: '100%', duration: 1, ease: smooth, onComplete: () => scanLine.classList.add('hidden') });
      gsap.to(scanDoc.querySelector('.sc-scan-page'), { background: '#fff', filter: 'contrast(1.2)', duration: 0.5, ease: smooth });
    }, '+=0.1');
    tl.add(() => { steps[2].classList.remove('active'); steps[2].classList.add('done'); }, '+=1');

    // Step 4: Convert to PDF
    tl.add(() => {
      steps[3].classList.add('active');
      gsap.to(scanFill, { width: '100%', duration: 0.4, ease: smooth });
    }, '+=0.1');
    tl.add(() => { steps[3].classList.remove('active'); steps[3].classList.add('done'); }, '+=0.5');

    // Show send button
    const scanActions = document.getElementById('p-scan-actions');
    tl.add(() => {
      scanActions.classList.remove('hidden');
      gsap.fromTo(scanActions, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.3');

    // Click send
    const scanSend = document.getElementById('p-scan-send');
    tl.add(() => moveCursor(scanSend, null), '+=0.5');
    tl.add(() => {
      gsap.to(scanSend, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.1');

    // Close scan overlay
    tl.add(() => {
      gsap.to(scanOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => scanOverlay.classList.add('hidden') });
      scanBtn.classList.remove('active-btn');
    }, '+=0.3');

    // Show received doc badges on all cards
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {
      showReceivedBadge(ucards, 'doc', 'Corrigé.docx');
    }, '+=0.3');

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // T15: Fin de séance (end session recap)
  // ============================================================
  function playT15() {
    resetAll();
    setupActiveScreen();
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Click Quitter button
    const quitBtn = document.getElementById('p-btn-quit');
    tl.add(() => moveCursor(quitBtn, null), '+=0.3');
    tl.add(() => {
      gsap.to(quitBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.1');

    // Show full-screen recap overlay
    const recapOverlay = document.getElementById('p-recap-overlay');
    tl.add(() => {
      recapOverlay.classList.remove('hidden');
      gsap.fromTo(recapOverlay, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: smooth });
      gsap.fromTo(recapOverlay.querySelector('.sc-recap-fullscreen'), { scale: 0.97, y: 20 }, { scale: 1, y: 0, duration: 0.5, ease: iosSpring });
    }, '+=0.3');

    // Stats animate in
    const stats = recapOverlay.querySelectorAll('.sc-recap-stat-val');
    stats.forEach((s, i) => {
      const target = parseInt(s.textContent);
      s.textContent = '0';
      tl.add(() => {
        gsap.to(s, { textContent: target, duration: 0.6, ease: smooth, snap: { textContent: 1 }, onUpdate: function() { s.textContent = Math.round(parseFloat(s.textContent)); } });
      }, i * 0.1 + 0.3);
    });
    tl.add(() => {}, '+=0.8');

    // Click disconnect tablets
    const disconnectBtn = document.getElementById('p-recap-disconnect-btn');
    tl.add(() => moveCursor(disconnectBtn, null), '+=0.5');
    tl.add(() => {
      gsap.to(disconnectBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
      disconnectBtn.classList.add('active');
    }, '+=0.1');

    // Show disconnect status
    const disconnectStatus = document.getElementById('p-recap-disconnect-status');
    const disconnectText = document.getElementById('p-recap-disconnect-text');
    tl.add(() => {
      disconnectStatus.classList.remove('hidden');
      disconnectText.textContent = '24 tablettes déconnectées';
      gsap.fromTo(disconnectStatus, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.4');

    // Click shutdown tablets
    const shutdownBtn = document.getElementById('p-recap-shutdown-btn');
    tl.add(() => moveCursor(shutdownBtn, null), '+=0.6');
    tl.add(() => {
      gsap.to(shutdownBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
      shutdownBtn.classList.add('active');
      disconnectText.textContent = '24 tablettes éteintes';
      gsap.fromTo(disconnectStatus, { opacity: 0.5 }, { opacity: 1, duration: 0.3 });
    }, '+=0.1');
    tl.add(() => {}, '+=0.5');

    // Click download all
    const dlAllBtn = document.getElementById('p-recap-dl-all');
    tl.add(() => moveCursor(dlAllBtn, null), '+=0.5');
    tl.add(() => {
      gsap.to(dlAllBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
      dlAllBtn.innerHTML = '<i class="ph ph-check" style="font-size:14px"></i> Téléchargé';
      dlAllBtn.style.color = '#34c759';
    }, '+=0.1');

    // Google Drive notification appears
    const driveNotif = document.getElementById('p-recap-drive');
    tl.add(() => {
      driveNotif.classList.remove('hidden');
      gsap.fromTo(driveNotif, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.8');

    tl.add(() => {}, '+=1');

    // Click "Relancer cette séance" button
    const relaunchBtn = document.getElementById('p-recap-relaunch');
    tl.add(() => moveCursor(relaunchBtn, null), '+=0.5');
    tl.add(() => {
      gsap.to(relaunchBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
      gsap.to(relaunchBtn, { background: 'rgba(0,122,255,.08)', color: '#007aff', borderColor: '#007aff', duration: 0.2 });
    }, '+=0.1');

    tl.add(() => {}, '+=1.5');
  }

  // ============================================================
  // T16: Partager un lien web en direct
  // ============================================================
  function playT16() {
    resetAll();
    setupActiveScreen();
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Focus on the action input
    const actionPanel = document.getElementById('p-action-panel');
    const shareDocBtn = document.getElementById('p-btn-share-doc');
    tl.add(() => moveCursor(shareDocBtn, null), '+=0.3');
    tl.add(() => { shareDocBtn.classList.add('active-btn'); }, '+=0.12');

    // Show send overlay — but with a link
    const sendOverlay = document.getElementById('p-send-overlay');
    const sendFile = document.getElementById('p-send-file');
    tl.add(() => {
      sendFile.innerHTML = '<span class="sc-res-icon link-badge" style="background:rgba(0,122,255,.1);color:#007aff">WEB</span><span>https://phet.colorado.edu/fr/simulations/gravity</span><span class="sc-send-check hidden" id="p-send-check"><i class="ph-fill ph-check-circle" style="font-size:18px;color:#34c759"></i></span>';
      sendOverlay.classList.remove('hidden');
      gsap.fromTo(sendOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(sendOverlay.querySelector('.sc-send-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: smooth });
    }, '+=0.2');

    const confirmBtn = document.getElementById('p-send-confirm');
    tl.add(() => moveCursor(confirmBtn, null), '+=0.6');
    tl.add(() => {
      const check = document.getElementById('p-send-check');
      check.classList.remove('hidden');
      gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.3, ease: smooth });
    }, '+=0.15');
    tl.add(() => {
      gsap.to(sendOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => {
        sendOverlay.classList.add('hidden');
        // Reset send file content
        sendFile.innerHTML = '<span class="sc-res-icon pdf">PDF</span><span>Evaluation_Finale.pdf</span><span class="sc-send-check hidden" id="p-send-check"><i class="ph-fill ph-check-circle" style="font-size:18px;color:#34c759"></i></span>';
      }});
      shareDocBtn.classList.remove('active-btn');
    }, '+=0.5');

    // Show received doc badges on all cards
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {
      showReceivedBadge(ucards, 'pdf', 'Consignes.pdf');
    }, '+=0.3');

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // T17: Lancer un minuteur de travail
  // ============================================================
  function playT17() {
    resetAll();
    setupActiveScreen();
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const timerBtn = document.getElementById('p-btn-timer');
    const timerOverlay = document.getElementById('p-timer-overlay');
    const timerOptions = document.getElementById('p-timer-options');
    const timerStart = document.getElementById('p-timer-start');
    const timerDisplay = document.getElementById('p-timer-display');
    const timerCountdown = document.getElementById('p-timer-countdown');
    const studentTimer = document.getElementById('p-student-timer');
    const studentCountdown = document.getElementById('p-student-countdown');
    const timerFill = document.getElementById('p-timer-fill');

    // Step 1: Click timer button
    tl.add(() => moveCursor(timerBtn, null));
    tl.add(() => {
      timerOverlay.classList.remove('hidden');
      gsap.fromTo(timerOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(timerOverlay.querySelector('.sc-timer-modal'), { scale: 0.95, y: 12 }, { scale: 1, y: 0, duration: 0.3, ease: iosSpring });
    }, '+=0.2');

    // Step 2: Select 5 minutes
    const opt5 = timerOptions?.querySelector('[data-minutes="5"]');
    tl.add(() => moveCursor(opt5, null), '+=0.6');
    tl.add(() => {
      timerOptions.querySelectorAll('.sc-timer-option').forEach(o => o.classList.remove('selected'));
      opt5.classList.add('selected');
    }, '+=0.15');

    // Step 3: Click start
    tl.add(() => moveCursor(timerStart, null), '+=0.4');
    tl.add(() => {
      gsap.to(timerStart, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.1');

    // Step 4: Close modal, show timer display + bar
    tl.add(() => {
      gsap.to(timerOverlay, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => {
        timerOverlay.classList.add('hidden');
        timerOptions.querySelectorAll('.sc-timer-option').forEach(o => o.classList.remove('selected'));
      }});
      // Show countdown in teacher subheader
      timerDisplay.classList.remove('hidden');
      timerDisplay.className = 'sc-timer-display';
      timerCountdown.textContent = '05:00';
      gsap.fromTo(timerDisplay, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: iosSpring });
      // Start timer bar fill
      gsap.to(timerFill, { width: '20%', duration: 0.5, ease: smooth });
      gsap.to(timerFill, { background: 'linear-gradient(90deg, #34c759, #5ac8fa)', duration: 0.3 });
    }, '+=0.2');

    // Step 5: Timer progresses (simulated countdown)
    tl.add(() => { timerCountdown.textContent = '04:12'; }, '+=0.8');
    tl.to(timerFill, { width: '40%', duration: 0.8, ease: smooth });
    tl.add(() => { timerCountdown.textContent = '03:28'; }, '+=0.6');
    tl.to(timerFill, { width: '55%', duration: 0.6, ease: smooth });
    tl.add(() => { timerCountdown.textContent = '02:15'; }, '+=0.5');
    tl.to(timerFill, { width: '70%', duration: 0.6, ease: smooth });

    // Step 6: Warning phase (orange)
    tl.add(() => {
      timerCountdown.textContent = '01:00';
      timerDisplay.className = 'sc-timer-display warning';
      gsap.to(timerFill, { background: 'linear-gradient(90deg, #ff9500, #ffcc02)', duration: 0.3 });
    }, '+=0.3');
    tl.to(timerFill, { width: '85%', duration: 0.5, ease: smooth });
    tl.add(() => { timerCountdown.textContent = '00:30'; }, '+=0.3');
    tl.to(timerFill, { width: '93%', duration: 0.4, ease: smooth });

    // Step 7: Danger phase (red)
    tl.add(() => {
      timerCountdown.textContent = '00:10';
      timerDisplay.className = 'sc-timer-display danger';
      gsap.to(timerFill, { background: 'linear-gradient(90deg, #ff3b30, #ff6961)', duration: 0.3 });
    }, '+=0.2');
    tl.to(timerFill, { width: '100%', duration: 0.4, ease: smooth });

    // Step 8: Timer complete — pulse
    tl.add(() => {
      timerCountdown.textContent = '00:00';
      gsap.to(timerFill, { opacity: 0.5, duration: 0.3, yoyo: true, repeat: 3, ease: smooth });
      gsap.to(timerDisplay, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 3, ease: smooth });
    }, '+=0.2');

    // Some students send "terminé"
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {}, '+=0.5');
    [4, 5, 22, 7].forEach((idx, i) => {
      tl.add(() => {
        const card = ucards[idx];
        if (!card) return;
        const badge = card.querySelector('.sc-interaction-badge');
        if (badge) {
          badge.className = 'sc-interaction-badge badge-done';
          badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>';
          card.classList.add('badge-active');
          gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.25, ease: iosSpring });
        }
      }, i * 0.2);
    });

    tl.add(() => {}, '+=1.5');
  }

  // ============================================================
  // T18: Groupes manuels (select cards → modal → create group)
  // ============================================================
  function playT18() {
    resetAll();
    setupActiveScreen();
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const createGroupBtn = document.getElementById('p-btn-create-group');
    const groupOverlay = document.getElementById('p-group-overlay');
    const groupBar = screens.teacher.querySelector('.sc-group-bar');
    const addBtn = document.getElementById('p-btn-group-add');
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');

    // Step 1: Click "Créer un groupe"
    tl.add(() => moveCursor(createGroupBtn, null), '+=0.3');
    tl.add(() => { createGroupBtn.classList.add('active-btn'); }, '+=0.15');

    // Step 2: Cards become selectable (visual hint)
    tl.add(() => {
      ucards.forEach(c => c.classList.add('selectable'));
    }, '+=0.3');

    // Step 3: Select 4 student cards manually
    const selectIndices = [0, 1, 2, 3];
    selectIndices.forEach((idx, i) => {
      tl.add(() => moveCursor(ucards[idx], null), '+=0.4');
      tl.add(() => {
        ucards[idx].classList.add('selected');
        gsap.fromTo(ucards[idx], { scale: 0.97 }, { scale: 1, duration: 0.2, ease: iosSpring });
      }, '+=0.1');
    });

    // Step 4: Open group modal with pre-selected students
    tl.add(() => {
      groupOverlay.classList.remove('hidden');
      gsap.fromTo(groupOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(groupOverlay.querySelector('.sc-group-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
      // Pre-select matching chips
      const chips = document.querySelectorAll('.sc-group-chip');
      [0, 1, 2, 3].forEach(i => { if (chips[i]) chips[i].classList.add('selected'); });
    }, '+=0.4');

    tl.add(() => {}, '+=0.8');

    // Step 5: Click confirm
    const confirmBtn = document.getElementById('p-group-confirm');
    tl.add(() => moveCursor(confirmBtn, null));
    tl.add(() => {
      gsap.to(confirmBtn, { scale: 0.96, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.1');

    // Step 6: Close modal, create group pill, color cards
    tl.add(() => {
      gsap.to(groupOverlay, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => {
        groupOverlay.classList.add('hidden');
        document.querySelectorAll('.sc-group-chip').forEach(c => c.classList.remove('selected'));
      }});
      createGroupBtn.classList.remove('active-btn');
      ucards.forEach(c => c.classList.remove('selectable', 'selected'));

      // Add group pill
      const pill = document.createElement('button');
      pill.className = 'sc-group-pill';
      pill.textContent = 'Groupe A';
      pill.style.borderColor = '#3b82f6';
      pill.style.color = '#3b82f6';
      groupBar.insertBefore(pill, addBtn);
      gsap.fromTo(pill, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: iosSpring });

      // Color selected cards
      selectIndices.forEach(i => {
        if (ucards[i]) {
          ucards[i].style.borderColor = '#3b82f6';
          ucards[i].style.boxShadow = '0 0 0 1.5px rgba(59,130,246,.2)';
        }
      });
    }, '+=0.2');

    tl.add(() => {}, '+=1');

    // Step 7: Repeat for second group
    tl.add(() => moveCursor(addBtn, null));
    tl.add(() => {
      ucards.forEach(c => c.classList.add('selectable'));
    }, '+=0.2');

    const selectIndices2 = [4, 5, 6, 7];
    selectIndices2.forEach((idx, i) => {
      tl.add(() => moveCursor(ucards[idx], null), '+=0.3');
      tl.add(() => {
        ucards[idx].classList.add('selected');
        gsap.fromTo(ucards[idx], { scale: 0.97 }, { scale: 1, duration: 0.2, ease: iosSpring });
      }, '+=0.1');
    });

    tl.add(() => {
      groupOverlay.classList.remove('hidden');
      gsap.fromTo(groupOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(groupOverlay.querySelector('.sc-group-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
      const chips = document.querySelectorAll('.sc-group-chip');
      [4, 5, 6, 7].forEach(i => { if (chips[i]) chips[i].classList.add('selected'); });
    }, '+=0.3');

    tl.add(() => moveCursor(confirmBtn, null), '+=0.6');
    tl.add(() => {
      gsap.to(groupOverlay, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => {
        groupOverlay.classList.add('hidden');
        document.querySelectorAll('.sc-group-chip').forEach(c => c.classList.remove('selected'));
      }});
      ucards.forEach(c => c.classList.remove('selectable', 'selected'));

      const pill2 = document.createElement('button');
      pill2.className = 'sc-group-pill';
      pill2.textContent = 'Groupe B';
      pill2.style.borderColor = '#34c759';
      pill2.style.color = '#34c759';
      groupBar.insertBefore(pill2, addBtn);
      gsap.fromTo(pill2, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: iosSpring });

      selectIndices2.forEach(i => {
        if (ucards[i]) {
          ucards[i].style.borderColor = '#34c759';
          ucards[i].style.boxShadow = '0 0 0 1.5px rgba(52,199,89,.2)';
        }
      });
    }, '+=0.15');

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // T19: ACCESS SESSIONS INDEX (from SQOOL Classe)
  // ============================================================
  function playT19() {
    resetAll();
    hideNarration();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Show sessions index
    tl.add(() => showScreen('sessions'));

    // Session rows stagger in
    const rows = document.querySelectorAll('.sc-session-row');
    rows.forEach(r => gsap.set(r, { opacity: 0, y: 12 }));
    tl.add(() => {
      rows.forEach((r, i) => gsap.to(r, { opacity: 1, y: 0, duration: 0.3, delay: i * 0.06, ease: springS }));
    }, '+=0.3');

    // Filter pills animate
    const filters = document.querySelectorAll('.sc-filter-pill');
    tl.add(() => {}, '+=1.5');

    // Click on "En cours" filter
    tl.add(() => {
      filters.forEach(f => f.classList.remove('active'));
      filters[1]?.classList.add('active');
      // Fade out non-active rows
      rows.forEach(r => {
        if (!r.classList.contains('active-row')) {
          gsap.to(r, { opacity: 0.3, duration: 0.25, ease: smooth });
        }
      });
    });
    tl.add(() => {}, '+=1');

    // Click back to "Toutes"
    tl.add(() => {
      filters.forEach(f => f.classList.remove('active'));
      filters[0]?.classList.add('active');
      rows.forEach(r => gsap.to(r, { opacity: 1, duration: 0.25, ease: smooth }));
    });
    tl.add(() => {}, '+=0.8');

    // Click "Reprendre" to go to teacher screen
    const resumeBtn = document.getElementById('p-btn-resume-session');
    tl.add(() => moveCursor(resumeBtn, null));
    tl.add(() => {
      gsap.to(resumeBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(resumeBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');
    tl.add(() => showScreen('teacher'), '+=0.3');
    setupActiveScreen();
    tl.add(() => {}, '+=1.5');
  }

  // ============================================================
  // T20: CREATE NEW SESSION
  // ============================================================
  function playT20() {
    resetAll();
    hideNarration();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Start on sessions screen
    tl.add(() => showScreen('sessions'));

    const rows = document.querySelectorAll('.sc-session-row');
    rows.forEach(r => gsap.set(r, { opacity: 0, y: 12 }));
    tl.add(() => {
      rows.forEach((r, i) => gsap.to(r, { opacity: 1, y: 0, duration: 0.25, delay: i * 0.04, ease: springS }));
    }, '+=0.3');
    tl.add(() => {}, '+=0.8');

    // Click "Nouvelle séance"
    const newBtn = document.getElementById('p-btn-new-session');
    tl.add(() => moveCursor(newBtn, null));
    tl.add(() => { newBtn.style.transform = 'scale(0.97)'; }, '+=0.1');
    tl.add(() => { newBtn.style.transform = ''; }, '+=0.08');

    // Show new session overlay
    const overlay = document.getElementById('p-newsession-overlay');
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-newsession-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.2');
    tl.add(() => {}, '+=1');

    // Type in title field
    const titleField = document.getElementById('p-ns-title');
    tl.add(() => moveCursor(titleField, null));
    tl.add(() => {
      titleField.style.borderColor = '#0ea5e9';
      titleField.style.background = '#fff';
    }, '+=0.15');
    tl.add(() => {}, '+=0.5');

    // Toggle an option
    const toggles = overlay.querySelectorAll('.sc-mini-toggle');
    const lastToggle = toggles[toggles.length - 1];
    if (lastToggle) {
      tl.add(() => moveCursor(lastToggle, null));
      tl.add(() => { lastToggle.classList.add('on'); }, '+=0.15');
    }
    tl.add(() => {}, '+=0.5');

    // Click launch
    const launchBtn = document.getElementById('p-newsession-launch');
    tl.add(() => moveCursor(launchBtn, null));
    tl.add(() => {
      gsap.to(launchBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(launchBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
    }, '+=0.2');

    // Transition to teacher screen
    tl.add(() => showScreen('teacher'), '+=0.3');
    setupActiveScreen();
    tl.add(() => {}, '+=1.5');
  }

  // ============================================================
  // T21: ASSIGNMENT MODE
  // ============================================================
  function playT21() {
    resetAll();
    hideNarration();
    setupActiveScreen();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Open assignment overlay from action panel
    const overlay = document.getElementById('p-assignment-overlay');
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-assignment-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => {}, '+=0.8');

    // Toggle restrictions one by one
    const toggles = overlay.querySelectorAll('.sc-mini-toggle');
    toggles.forEach((t, i) => {
      if (i < 3) return; // first 3 already on
      tl.add(() => moveCursor(t, null), '+=0.2');
      tl.add(() => { t.classList.add('on'); }, '+=0.1');
    });
    tl.add(() => {}, '+=0.5');

    // Select an app chip
    const chips = overlay.querySelectorAll('.sc-app-chip');
    chips.forEach(c => {
      if (!c.classList.contains('selected')) {
        tl.add(() => moveCursor(c, null), '+=0.15');
        tl.add(() => { c.classList.add('selected'); gsap.fromTo(c, { scale: 0.95 }, { scale: 1, duration: 0.15, ease: smooth }); }, '+=0.1');
      }
    });
    tl.add(() => {}, '+=0.5');

    // Click "Distribuer le devoir"
    const launchBtn = document.getElementById('p-assignment-launch');
    tl.add(() => moveCursor(launchBtn, null));
    tl.add(() => {
      gsap.to(launchBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(launchBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
    }, '+=0.2');

    // Show feedback: assignment distributed to all cards
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {
      ucards.forEach((card) => {
        card.classList.add('border-purple');
        card.style.borderColor = '#8b5cf6';
        card.style.boxShadow = '0 0 0 1px rgba(139,92,246,.15)';
      });
      showReceivedBadge(ucards, 'doc', 'Devoir.docx');
    }, '+=0.4');

    // Timer bar starts (simulates assignment timer)
    const timerBar = document.querySelector('.sc-timer-bar');
    const timerFill = document.querySelector('.sc-timer-fill');
    if (timerFill) {
      tl.add(() => {
        gsap.set(timerFill, { width: '0%', background: '#8b5cf6' });
        gsap.to(timerFill, { width: '15%', duration: 2, ease: 'none' });
      }, '+=0.3');
    }
    tl.add(() => {}, '+=2.5');
  }

  // ============================================================
  // T22: OFFICIAL EXAM — CONFIGURATION & LAUNCH
  // ============================================================
  function playT22() {
    resetAll();
    hideNarration();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Start on sessions screen
    tl.add(() => showScreen('sessions'));

    const rows = document.querySelectorAll('.sc-session-row');
    rows.forEach(r => gsap.set(r, { opacity: 0, y: 12 }));
    tl.add(() => {
      rows.forEach((r, i) => gsap.to(r, { opacity: 1, y: 0, duration: 0.25, delay: i * 0.04, ease: springS }));
    }, '+=0.2');
    tl.add(() => {}, '+=0.8');

    // Click "Examen officiel" button
    const examBtn = document.getElementById('p-btn-new-exam');
    tl.add(() => moveCursor(examBtn, null));
    tl.add(() => {
      gsap.to(examBtn, { scale: 0.97, duration: 0.06 });
      gsap.to(examBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');

    // Show exam config overlay
    const overlay = document.getElementById('p-exam-overlay');
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-exam-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.2');
    tl.add(() => {}, '+=1');

    // Scroll through restrictions (highlight them one by one)
    const restricts = overlay.querySelectorAll('.sc-exam-restrict');
    restricts.forEach((r, i) => {
      tl.add(() => {
        r.style.background = '#fee2e2';
        gsap.fromTo(r, { x: -4 }, { x: 0, duration: 0.2, ease: smooth });
        if (i > 0) restricts[i - 1].style.background = '';
      }, i === 0 ? '+=0.5' : '+=0.25');
    });
    tl.add(() => { restricts[restricts.length - 1].style.background = ''; }, '+=0.3');
    tl.add(() => {}, '+=0.5');

    // Click "Lancer l'examen"
    const launchBtn = document.getElementById('p-exam-launch');
    tl.add(() => moveCursor(launchBtn, null));
    tl.add(() => {
      gsap.to(launchBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(launchBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      launchBtn.textContent = 'Examen lancé';
      launchBtn.style.background = '#16a34a';
    }, '+=0.15');
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => {
        overlay.classList.add('hidden');
        launchBtn.innerHTML = '<i class="ph ph-shield-check" style="font-size:14px"></i> Lancer l\'examen';
        launchBtn.style.background = '';
      }});
    }, '+=0.8');

    // Show exam surveillance view
    const survOverlay = document.getElementById('p-exam-surv-overlay');
    const examGrid = document.getElementById('p-exam-grid');

    // Generate 32 exam cards
    examGrid.innerHTML = '';
    const studentNames = [
      'ALLARD Théo','BOUCHAMI Aya','CHEN Wei','DUPONT Chloé','FAURE Lucas',
      'GARNIER Nolan','IBRAHIM Fatou','JOURDAIN Léa','KIM Soo','LAMBERT Hugo',
      'MARTIN Léa','NGUYEN Tam','OLIVIER Marc','PETIT Clara','QUENTIN Paul',
      'ROUSSEAU Inès','SINGH Ravi','THOMAS Axel','UEDA Yuki','VIDAL Emma',
      'WANG Li','XAVIER Jules','YILMAZ Elif','ZHANG Min','BERNARD Alice',
      'CARON Maxime','DESCHAMPS Lucie','FOURNIER Tom','GIRARD Manon','HENRY Louis',
      'LEROY Jade','MORIN Enzo'
    ];
    studentNames.forEach(name => {
      const card = document.createElement('div');
      card.className = 'sc-exam-card';
      card.innerHTML = `<div class="sc-exam-card-screen"><div class="sc-screen-content" style="background:linear-gradient(135deg,#1e293b,#334155);display:flex;align-items:center;justify-content:center;font-size:8px;color:#475569">Examen</div></div><div class="sc-exam-card-footer"><span class="sc-exam-card-name">${name}</span><span class="sc-exam-card-status working">En cours</span></div>`;
      examGrid.appendChild(card);
    });

    tl.add(() => {
      survOverlay.classList.remove('hidden');
      gsap.fromTo(survOverlay, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: smooth });
    }, '+=0.3');

    // Cards stagger in
    const examCards = examGrid.querySelectorAll('.sc-exam-card');
    examCards.forEach(c => gsap.set(c, { opacity: 0, scale: 0.9 }));
    tl.add(() => {
      examCards.forEach((c, i) => gsap.to(c, { opacity: 1, scale: 1, duration: 0.2, delay: i * 0.02, ease: springS }));
    }, '+=0.3');

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // T23: EXAM SURVEILLANCE
  // ============================================================
  function playT23() {
    resetAll();
    hideNarration();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Set up surveillance view directly
    const survOverlay = document.getElementById('p-exam-surv-overlay');
    const examGrid = document.getElementById('p-exam-grid');

    // Generate exam cards
    examGrid.innerHTML = '';
    const names = [
      'ALLARD T.','BOUCHAMI A.','CHEN W.','DUPONT C.','FAURE L.',
      'GARNIER N.','IBRAHIM F.','JOURDAIN L.','KIM S.','LAMBERT H.',
      'MARTIN L.','NGUYEN T.','OLIVIER M.','PETIT C.','QUENTIN P.',
      'ROUSSEAU I.','SINGH R.','THOMAS A.','UEDA Y.','VIDAL E.',
      'WANG L.','XAVIER J.','YILMAZ E.','ZHANG M.','BERNARD A.',
      'CARON M.','DESCHAMPS L.','FOURNIER T.','GIRARD M.','HENRY L.',
      'LEROY J.','MORIN E.'
    ];
    names.forEach(name => {
      const card = document.createElement('div');
      card.className = 'sc-exam-card';
      card.innerHTML = `<div class="sc-exam-card-screen"><div class="sc-screen-content" style="background:linear-gradient(135deg,#1e293b,#334155);display:flex;align-items:center;justify-content:center;font-size:8px;color:#475569">Examen</div></div><div class="sc-exam-card-footer"><span class="sc-exam-card-name">${name}</span><span class="sc-exam-card-status working">En cours</span></div>`;
      examGrid.appendChild(card);
    });

    showScreen('teacher', true);
    survOverlay.classList.remove('hidden');
    gsap.set(survOverlay, { opacity: 1 });

    const examCards = examGrid.querySelectorAll('.sc-exam-card');
    examCards.forEach(c => gsap.set(c, { opacity: 1, scale: 1 }));

    // Timer countdown simulation
    const timerText = document.getElementById('p-exam-timer-text');
    const workingEl = document.getElementById('p-exam-working');
    const finishedEl = document.getElementById('p-exam-finished');

    tl.add(() => { timerText.textContent = '1:15:30'; }, '+=0.5');
    tl.add(() => { timerText.textContent = '0:45:20'; }, '+=1');

    // Some students finish
    const finishOrder = [3, 7, 16, 24, 12, 1, 19, 28];
    finishOrder.forEach((idx, i) => {
      tl.add(() => {
        const card = examCards[idx];
        if (card) {
          card.classList.add('finished');
          const status = card.querySelector('.sc-exam-card-status');
          if (status) { status.className = 'sc-exam-card-status done'; status.textContent = 'Terminé'; }
          gsap.fromTo(card, { boxShadow: '0 0 0 2px #22c55e' }, { boxShadow: '0 0 0 1px #22c55e', duration: 0.5 });
        }
        workingEl.textContent = 32 - (i + 1) - 2;
        finishedEl.textContent = i + 1 + 2;
      }, i === 0 ? '+=0.8' : '+=0.4');
    });

    tl.add(() => { timerText.textContent = '0:12:05'; }, '+=0.5');
    tl.add(() => {}, '+=0.5');

    // Alert on a student (idle)
    tl.add(() => {
      const alertCard = examCards[5];
      if (alertCard) {
        alertCard.classList.add('alert');
        const status = alertCard.querySelector('.sc-exam-card-status');
        if (status) { status.className = 'sc-exam-card-status idle'; status.textContent = 'Inactif'; }
        gsap.fromTo(alertCard, { scale: 1 }, { scale: 1.02, duration: 0.3, yoyo: true, repeat: 2, ease: smooth });
      }
    });
    tl.add(() => {}, '+=1');

    // Collect copies button
    const collectBtn = document.getElementById('p-exam-collect');
    tl.add(() => moveCursor(collectBtn, null));
    tl.add(() => {
      gsap.to(collectBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(collectBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      collectBtn.innerHTML = '<i class="ph ph-check" style="font-size:14px"></i> 32 copies récupérées';
      collectBtn.style.background = '#16a34a'; collectBtn.style.borderColor = '#16a34a'; collectBtn.style.color = '#fff';
    }, '+=0.15');
    tl.add(() => {}, '+=1');

    // End exam
    const endBtn = document.getElementById('p-exam-end');
    tl.add(() => moveCursor(endBtn, null));
    tl.add(() => {
      gsap.to(endBtn, { scale: 0.96, duration: 0.06 });
      gsap.to(endBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');

    // Transition to recap
    tl.add(() => {
      gsap.to(survOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => {
        survOverlay.classList.add('hidden');
        // Reset collect button
        collectBtn.innerHTML = '<i class="ph ph-download" style="font-size:14px"></i> Récupérer les copies';
        collectBtn.style.background = ''; collectBtn.style.borderColor = ''; collectBtn.style.color = '';
      }});
    }, '+=0.3');

    // Show exam recap
    const recapOverlay = document.getElementById('p-exam-recap-overlay');
    tl.add(() => {
      recapOverlay.classList.remove('hidden');
      gsap.fromTo(recapOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      gsap.fromTo(recapOverlay.querySelector('.sc-exam-recap-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.3');

    // Animate stat numbers
    ['p-er-copies','p-er-finished','p-er-incidents'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const target = parseInt(el.textContent);
        el.textContent = '0';
        tl.add(() => gsap.to(el, { textContent: target, duration: 0.6, snap: { textContent: 1 }, ease: smooth }), '<');
      }
    });

    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // T24: EXAM RECAP — SAVE, EMAIL, CORRECTION
  // ============================================================
  function playT24() {
    resetAll();
    hideNarration();
    showScreen('teacher', true);

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Show exam recap directly
    const recapOverlay = document.getElementById('p-exam-recap-overlay');
    recapOverlay.classList.remove('hidden');
    gsap.set(recapOverlay, { opacity: 1 });
    const modal = recapOverlay.querySelector('.sc-exam-recap-modal');
    gsap.set(modal, { scale: 1, y: 0 });

    tl.add(() => {}, '+=0.5');

    // Click "Télécharger toutes les copies"
    const dlBtn = document.getElementById('p-er-download');
    tl.add(() => moveCursor(dlBtn, null));
    tl.add(() => {
      gsap.to(dlBtn, { scale: 0.98, duration: 0.06 });
      gsap.to(dlBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      dlBtn.style.background = '#dcfce7'; dlBtn.style.borderColor = '#86efac'; dlBtn.style.color = '#16a34a';
      dlBtn.innerHTML = '<i class="ph ph-check-circle" style="font-size:16px"></i> Téléchargement en cours...';
    }, '+=0.15');
    tl.add(() => {
      dlBtn.innerHTML = '<i class="ph ph-check-circle" style="font-size:16px"></i> 32 copies téléchargées';
    }, '+=1');
    tl.add(() => {}, '+=0.5');

    // Click "Sauvegarder sur Google Drive"
    const driveBtn = document.getElementById('p-er-drive');
    tl.add(() => moveCursor(driveBtn, null));
    tl.add(() => {
      gsap.to(driveBtn, { scale: 0.98, duration: 0.06 });
      gsap.to(driveBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');
    // Show drive notification
    const driveNotif = document.getElementById('p-er-drive-notif');
    tl.add(() => {
      driveNotif.classList.remove('hidden');
      gsap.fromTo(driveNotif, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }, '+=0.3');
    tl.add(() => {}, '+=1');

    // Click "Envoyer par email"
    const emailBtn = document.getElementById('p-er-email');
    tl.add(() => moveCursor(emailBtn, null));
    tl.add(() => {
      gsap.to(emailBtn, { scale: 0.98, duration: 0.06 });
      gsap.to(emailBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
    }, '+=0.15');
    // Show email draft
    const emailDraft = document.getElementById('p-er-email-draft');
    tl.add(() => {
      emailDraft.classList.remove('hidden');
      gsap.fromTo(emailDraft, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => {}, '+=1.2');

    // Click send email
    const emailSend = document.getElementById('p-er-email-send');
    tl.add(() => moveCursor(emailSend, null));
    tl.add(() => {
      gsap.to(emailSend, { scale: 0.96, duration: 0.06 });
      gsap.to(emailSend, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      emailSend.textContent = 'Envoyé';
      emailSend.style.background = '#16a34a';
    }, '+=0.15');
    tl.add(() => {}, '+=0.8');

    // Click "Ouvrir le mode correction"
    const correctBtn = document.getElementById('p-er-correct');
    tl.add(() => moveCursor(correctBtn, null));
    tl.add(() => {
      gsap.to(correctBtn, { scale: 0.98, duration: 0.06 });
      gsap.to(correctBtn, { scale: 1, duration: 0.15, delay: 0.06, ease: smooth });
      correctBtn.style.background = '#dbeafe'; correctBtn.style.borderColor = '#93c5fd'; correctBtn.style.color = '#2563eb';
      correctBtn.innerHTML = '<i class="ph ph-pencil-line" style="font-size:16px"></i> Mode correction (bientôt disponible)';
    }, '+=0.15');
    tl.add(() => {}, '+=1.5');
  }

  // --- T25: Voir l'écran d'un élève (carousel) ---
  // TEST: using cbEase (cubic-bezier 0.86,0,0.07,1) for all motion transitions
  function playT25() {
    resetAll();
    setupActiveScreen();

    const SLIDE_DUR = 0.7; // carousel slide duration — visible movement

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const viewer = document.getElementById('p-student-viewer');
    const svAvatar = document.getElementById('p-sv-avatar');
    const svName = document.getElementById('p-sv-name');
    const svApp = document.getElementById('p-sv-app');
    const slidePrev = document.getElementById('p-sv-slide-prev');
    const slideCurrent = document.getElementById('p-sv-slide-current');
    const slideNext = document.getElementById('p-sv-slide-next');
    const svCounter = document.getElementById('p-sv-counter');
    const svLockBtn = document.getElementById('p-sv-lock');
    const svLockedOverlay = document.getElementById('p-sv-locked-overlay');
    const svPrev = document.getElementById('p-sv-prev');
    const svNext = document.getElementById('p-sv-next');
    const svClose = document.getElementById('p-sv-close');

    // Student data extracted from cards
    const students = [];
    ucards.forEach((card, i) => {
      const name = card.querySelector('.sc-ucard-name')?.textContent || '';
      const avatar = card.querySelector('.sc-ucard-avatar');
      const initials = avatar?.textContent?.trim() || '';
      const avatarBg = avatar?.style.background || '#64748b';
      const appEl = card.querySelector('.sc-ucard-app');
      const screenContent = card.querySelector('.sc-screen-content');
      students.push({ index: i, name, initials, avatarBg, appHTML: appEl?.innerHTML || '', screenHTML: screenContent?.outerHTML || '' });
    });

    let currentIdx = 4; // Start with Chloé (index 4)

    // Fill a slide element with student screen content
    function fillSlide(slideEl, idx) {
      if (idx < 0 || idx >= students.length) { slideEl.innerHTML = ''; return; }
      slideEl.innerHTML = students[idx].screenHTML;
    }

    // Update header info for current student
    function updateHeader(idx) {
      const s = students[idx];
      if (!s) return;
      svAvatar.textContent = s.initials;
      svAvatar.style.background = s.avatarBg;
      svName.textContent = s.name;
      svApp.innerHTML = s.appHTML;
      svCounter.textContent = (idx + 1) + ' / ' + students.length;
    }

    // Set carousel to show idx (instant, no animation)
    function setCarousel(idx) {
      currentIdx = idx;
      updateHeader(idx);
      fillSlide(slidePrev, idx - 1);
      fillSlide(slideCurrent, idx);
      fillSlide(slideNext, idx + 1);
      svLockBtn.classList.remove('locked');
      svLockedOverlay.classList.add('hidden');
    }

    // Animate carousel to next/prev with visible sliding motion
    function animateCarousel(direction) {
      const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (newIdx < 0 || newIdx >= students.length) return;

      // Animate header info change
      updateHeader(newIdx);

      if (direction === 'next') {
        // Current → shrinks left, becomes prev; Next → grows center, becomes current
        // Animate current slide: scale down + fade + move left
        gsap.to(slideCurrent, { scale: 0.9, opacity: 0.4, x: '-30%', duration: SLIDE_DUR, ease: cbEase });
        // Animate next slide: scale up + brighten + move to center
        gsap.to(slideNext, { scale: 1, opacity: 1, x: '-30%', duration: SLIDE_DUR, ease: cbEase,
          onComplete: () => {
            // Reset positions instantly and update content
            currentIdx = newIdx;
            gsap.set([slidePrev, slideCurrent, slideNext], { clearProps: 'transform,opacity,x' });
            fillSlide(slidePrev, currentIdx - 1);
            fillSlide(slideCurrent, currentIdx);
            fillSlide(slideNext, currentIdx + 1);
          }
        });
        // Fade out prev (it scrolls away)
        gsap.to(slidePrev, { opacity: 0, x: '-40%', duration: SLIDE_DUR, ease: cbEase });
      } else {
        // Prev → grows center; Current → shrinks right
        gsap.to(slideCurrent, { scale: 0.9, opacity: 0.4, x: '30%', duration: SLIDE_DUR, ease: cbEase });
        gsap.to(slidePrev, { scale: 1, opacity: 1, x: '30%', duration: SLIDE_DUR, ease: cbEase,
          onComplete: () => {
            currentIdx = newIdx;
            gsap.set([slidePrev, slideCurrent, slideNext], { clearProps: 'transform,opacity,x' });
            fillSlide(slidePrev, currentIdx - 1);
            fillSlide(slideCurrent, currentIdx);
            fillSlide(slideNext, currentIdx + 1);
          }
        });
        gsap.to(slideNext, { opacity: 0, x: '40%', duration: SLIDE_DUR, ease: cbEase });
      }
    }

    // --- Step 1: Click on Chloé's card ---
    const chloeCard = ucards[4];
    tl.add(() => moveCursor(chloeCard, null));
    tl.add(() => {
      gsap.to(chloeCard, { scale: 0.97, duration: 0.06 });
      gsap.to(chloeCard, { scale: 1, duration: 0.15, delay: 0.06 });
    }, '+=0.15');

    // --- Step 2: Open full-screen viewer ---
    tl.add(() => {
      viewer.classList.remove('hidden');
      gsap.fromTo(viewer, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: cbEase });
      setCarousel(4);
      // Scale-in the carousel
      const carousel = viewer.querySelector('.sc-sv-carousel');
      gsap.fromTo(carousel, { scale: 0.92, y: 12 }, { scale: 1, y: 0, duration: 0.5, ease: cbEase });
    }, '+=0.15');
    tl.add(() => {}, '+=1.2');

    // --- Step 3: Navigate to next student ---
    tl.add(() => moveCursor(svNext, null));
    tl.add(() => {
      gsap.to(svNext, { scale: 0.9, duration: 0.06 });
      gsap.to(svNext, { scale: 1, duration: 0.15, delay: 0.06 });
      animateCarousel('next');
    }, '+=0.15');
    tl.add(() => {}, '+=' + (SLIDE_DUR + 0.4));

    // Navigate again
    tl.add(() => {
      gsap.to(svNext, { scale: 0.9, duration: 0.06 });
      gsap.to(svNext, { scale: 1, duration: 0.15, delay: 0.06 });
      animateCarousel('next');
    }, '+=0.2');
    tl.add(() => {}, '+=' + (SLIDE_DUR + 0.4));

    // --- Step 4: Navigate back ---
    tl.add(() => moveCursor(svPrev, null));
    tl.add(() => {
      gsap.to(svPrev, { scale: 0.9, duration: 0.06 });
      gsap.to(svPrev, { scale: 1, duration: 0.15, delay: 0.06 });
      animateCarousel('prev');
    }, '+=0.15');
    tl.add(() => {}, '+=' + (SLIDE_DUR + 0.4));

    // --- Step 5: Lock student screen ---
    tl.add(() => moveCursor(svLockBtn, null));
    tl.add(() => {
      gsap.to(svLockBtn, { scale: 0.9, duration: 0.06 });
      gsap.to(svLockBtn, { scale: 1, duration: 0.15, delay: 0.06 });
      svLockBtn.classList.add('locked');
      svLockedOverlay.classList.remove('hidden');
      gsap.fromTo(svLockedOverlay, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: cbEase });
    }, '+=0.15');
    tl.add(() => {}, '+=1');

    // --- Step 6: Unlock ---
    tl.add(() => {
      gsap.to(svLockBtn, { scale: 0.9, duration: 0.06 });
      gsap.to(svLockBtn, { scale: 1, duration: 0.15, delay: 0.06 });
      svLockBtn.classList.remove('locked');
      gsap.to(svLockedOverlay, { opacity: 0, duration: 0.5, ease: cbEase, onComplete: () => svLockedOverlay.classList.add('hidden') });
    }, '+=0.2');
    tl.add(() => {}, '+=0.8');

    // --- Step 7: Close viewer ---
    tl.add(() => moveCursor(svClose, null));
    tl.add(() => {
      gsap.to(svClose, { scale: 0.9, duration: 0.06 });
      gsap.to(svClose, { scale: 1, duration: 0.15, delay: 0.06 });
      gsap.to(viewer, { opacity: 0, duration: 0.5, ease: cbEase, onComplete: () => { viewer.classList.add('hidden'); gsap.set(viewer, { clearProps: 'opacity' }); } });
    }, '+=0.15');
  }

  // ============================================================
  // SCENARIO NARRATION SYSTEM
  // ============================================================

  const narrationPanel = document.getElementById('sc-narration');
  const narrationToggle = document.getElementById('sc-narration-toggle');
  const narrationExpand = document.getElementById('sc-narration-expand');
  const stepsBar = document.getElementById('proto-steps-bar');
  const stepsWrapper = document.getElementById('proto-steps-wrapper');
  const navPrev = document.getElementById('proto-nav-prev');
  const navNext = document.getElementById('proto-nav-next');
  const playPauseBtn = document.getElementById('proto-play-pause');
  const playIcon = document.getElementById('proto-play-icon');
  const infoBadge = document.getElementById('proto-info-badge');
  let isPaused = false;
  let narrationHasContent = false;
  let scenarioSteps = [];
  let scenarioStepCallbacks = [];
  let currentStepIdx = -1;
  let isManualNav = false;

  function showNarration(config) {
    if (!narrationPanel) return;
    narrationHasContent = true;
    scenarioSteps = config.steps || [];

    // Populate sidebar (context + characters + UX only)
    document.getElementById('sc-narration-label').textContent = config.label;
    document.getElementById('sc-narration-title').textContent = config.title;
    document.getElementById('sc-narration-situation').textContent = config.situation;

    // Characters
    const charsEl = document.getElementById('sc-narration-characters');
    charsEl.innerHTML = config.characters.map(c =>
      '<div class="sc-narration-char">' +
        '<div class="sc-narration-char-avatar" style="background:' + c.color + '">' + c.initials + '</div>' +
        '<div class="sc-narration-char-info">' +
          '<span class="sc-narration-char-name">' + c.name + '</span>' +
          '<span class="sc-narration-char-role">' + c.role + '</span>' +
        '</div>' +
      '</div>'
    ).join('');

    // Horizontal step bar
    if (stepsBar && scenarioSteps.length > 0) {
      stepsBar.innerHTML = scenarioSteps.map((s, i) => {
        const connector = i < scenarioSteps.length - 1 ? '<div class="proto-step-connector"></div>' : '';
        return '<div class="proto-step" id="proto-step-' + i + '" data-step="' + i + '">' +
          '<div class="proto-step-num">' + (i + 1) + '</div>' +
          '<div class="proto-step-who ' + s.who + '">' + (s.who === 'teacher' ? 'Prof' : 'Élève') + '</div>' +
          '<span class="proto-step-label">' + s.action + '</span>' +
        '</div>' + connector;
      }).join('');
      if (stepsWrapper) stepsWrapper.classList.remove('hidden');

      // Click handlers on steps
      stepsBar.querySelectorAll('.proto-step').forEach(step => {
        step.addEventListener('click', () => {
          const idx = parseInt(step.dataset.step);
          goToStep(idx);
        });
      });

      // Reset play/pause state
      isPaused = false;
      updatePlayPauseUI();
    } else {
      if (stepsWrapper) stepsWrapper.classList.add('hidden');
      if (stepsBar) stepsBar.innerHTML = '';
    }

    // Show sidebar
    openNarrationSidebar();
  }

  function openNarrationSidebar() {
    if (!narrationPanel) return;
    narrationPanel.classList.remove('hidden', 'collapsed');
  }

  function collapseNarrationSidebar() {
    if (!narrationPanel) return;
    narrationPanel.classList.add('collapsed');
    if (narrationExpand && narrationHasContent) narrationExpand.classList.remove('hidden');
  }

  function setNarrationStep(idx, uxText) {
    currentStepIdx = idx;

    // Add label to current timeline for seek navigation
    if (currentTL) {
      currentTL.addLabel('step-' + idx);
    }

    // Update horizontal step bar
    if (stepsBar) {
      const steps = stepsBar.querySelectorAll('.proto-step');
      steps.forEach((s, i) => {
        s.classList.remove('active', 'done');
        if (i < idx) s.classList.add('done');
        if (i === idx) s.classList.add('active');
      });
      // Scroll active step into view
      const activeStep = document.getElementById('proto-step-' + idx);
      if (activeStep) activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Update nav arrows state
    if (navPrev) navPrev.disabled = (idx <= 0 || scenarioSteps.length === 0);
    if (navNext) navNext.disabled = (idx >= scenarioSteps.length - 1 || scenarioSteps.length === 0);

    // UX guideline in sidebar
    const uxPanel = document.getElementById('sc-narration-ux');
    const uxTextEl = document.getElementById('sc-narration-ux-text');
    if (uxText) {
      uxPanel.classList.remove('hidden');
      uxTextEl.textContent = uxText;
      gsap.fromTo(uxPanel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
    } else {
      uxPanel.classList.add('hidden');
    }
  }

  // Manual step navigation — pauses timeline, seeks to step position
  function goToStep(idx) {
    if (!currentTL || idx < 0 || idx >= scenarioSteps.length) return;
    // Find the step label in the timeline
    const label = 'step-' + idx;
    if (currentTL.labels && currentTL.labels[label] !== undefined) {
      currentTL.seek(label);
      currentTL.play();
    }
  }

  function hideNarration() {
    if (!narrationPanel) return;
    narrationHasContent = false;
    narrationPanel.classList.add('hidden');
    narrationPanel.classList.remove('collapsed');
    if (narrationExpand) narrationExpand.classList.add('hidden');
    if (stepsWrapper) stepsWrapper.classList.add('hidden');
    if (stepsBar) stepsBar.innerHTML = '';
    isPaused = false;
    updatePlayPauseUI();
    scenarioSteps = [];
    scenarioStepCallbacks = [];
    currentStepIdx = -1;
  }

  // Toggle button handlers
  if (narrationToggle) {
    narrationToggle.addEventListener('click', () => collapseNarrationSidebar());
  }
  if (narrationExpand) {
    narrationExpand.addEventListener('click', () => openNarrationSidebar());
  }

  // Navigation arrow handlers
  if (navPrev) {
    navPrev.addEventListener('click', () => {
      if (currentStepIdx > 0) goToStep(currentStepIdx - 1);
    });
  }
  if (navNext) {
    navNext.addEventListener('click', () => {
      if (currentStepIdx < scenarioSteps.length - 1) goToStep(currentStepIdx + 1);
    });
  }

  // Play/Pause toggle
  function updatePlayPauseUI() {
    if (!playPauseBtn || !playIcon) return;
    playIcon.className = isPaused ? 'ph ph-play' : 'ph ph-pause';
    playPauseBtn.classList.toggle('paused', isPaused);
    playPauseBtn.title = isPaused ? 'Reprendre' : 'Pause';
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (!currentTL) return;
      isPaused = !isPaused;
      if (isPaused) {
        currentTL.pause();
      } else {
        currentTL.play();
      }
      updatePlayPauseUI();
    });
  }

  // ============================================================
  // NARRATIVE ELLIPSE SYSTEM (teacher ↔ student transitions)
  // ============================================================
  const ellipseOverlay = document.getElementById('ellipse-overlay');
  const ellipseFromLabel = document.getElementById('ellipse-from-label');
  const ellipseToLabel = document.getElementById('ellipse-to-label');
  const ellipseFromIcon = document.getElementById('ellipse-from-icon');
  const ellipseToIcon = document.getElementById('ellipse-to-icon');
  const ellipseActionText = document.getElementById('ellipse-action-text');
  const ellipseResultText = document.getElementById('ellipse-result-text');
  const ellipsePulse = document.getElementById('ellipse-pulse');
  const ellipseArrow = document.getElementById('ellipse-arrow');

  /**
   * Show a narrative ellipse: animated transition between teacher and student
   * @param {object} config
   * @param {string} config.direction - 'teacher-to-student' or 'student-to-teacher'
   * @param {string} config.action - What the source is doing
   * @param {string} config.result - What happens on the target
   * @param {number} config.duration - Total display time in seconds (default 2.5)
   * @param {function} config.onComplete - Callback when ellipse finishes
   */
  function showEllipse(config) {
    if (!ellipseOverlay) return;
    const { direction = 'teacher-to-student', action = '', result = '', duration = 2.5, onComplete } = config;

    const isReverse = direction === 'student-to-teacher';
    ellipseOverlay.classList.toggle('reverse', isReverse);

    // Set labels
    ellipseFromLabel.textContent = isReverse ? 'Élève' : 'Enseignant';
    ellipseToLabel.textContent = isReverse ? 'Enseignant' : 'Tablettes';
    ellipseFromIcon.innerHTML = isReverse
      ? '<i class="ph ph-device-tablet"></i>'
      : '<i class="ph ph-desktop"></i>';
    ellipseToIcon.innerHTML = isReverse
      ? '<i class="ph ph-desktop"></i>'
      : '<i class="ph ph-device-tablet"></i>';
    ellipseActionText.textContent = action;
    ellipseResultText.textContent = result;

    // Show overlay
    ellipseOverlay.classList.remove('hidden');
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(ellipseOverlay, {
          opacity: 0, duration: 0.3, ease: smooth,
          onComplete: () => {
            ellipseOverlay.classList.add('hidden');
            gsap.set(ellipseOverlay, { opacity: 1 });
            onComplete?.();
          }
        });
      }
    });

    // Entrance: fade in overlay
    tl.fromTo(ellipseOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });

    // From device entrance
    tl.fromTo('#ellipse-from', { opacity: 0, x: -30, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: iosSpring }, 0.1);

    // Arrow draws in
    tl.fromTo(ellipseArrow, { opacity: 0, scaleX: 0 },
      { opacity: 1, scaleX: 1, duration: 0.4, ease: smooth, transformOrigin: 'left center' }, 0.3);

    // Pulse travels across
    tl.fromTo(ellipsePulse,
      { left: '0%', opacity: 0, scale: 0 },
      { left: '100%', opacity: 1, scale: 1, duration: 0.6, ease: 'power2.inOut' }, 0.4);

    // To device entrance
    tl.fromTo('#ellipse-to', { opacity: 0, x: 30, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: iosSpring }, 0.7);

    // Hold
    tl.add(() => {}, '+=' + Math.max(0, duration - 1.5));

    return tl;
  }

  /**
   * Helper: add an ellipse step to an existing GSAP timeline
   * Returns the label position where the ellipse was inserted
   */
  function addEllipseToTimeline(tl, config, position) {
    tl.add(() => showEllipse(config), position);
    tl.add(() => {}, '+=' + (config.duration || 2.5));
  }

  // ============================================================
  // SCENARIO 1: Démarrer et distribuer les ressources
  // ============================================================
  function playSC1() {
    resetAll();
    hideNarration();

    showNarration({
      label: 'Scénario 1',
      title: 'Démarrer et distribuer',
      situation: 'M. David commence sa séance de physique avec la classe de 2G3. Il affiche le QR code, les élèves scannent et rejoignent la classe progressivement. Il active l\'affichage des écrans puis distribue le cours du jour.',
      characters: [
        { name: 'Thomas David', initials: 'TD', color: '#3b82f6', role: 'Enseignant de physique' },
        { name: 'Chloé Dupont', initials: 'CD', color: '#ec4899', role: 'Élève, 2G3' },
        { name: 'Marius Berthelot', initials: 'MB', color: '#14b8a6', role: 'Élève, 2G3 — souvent en retard' },
      ],
      steps: [
        { who: 'teacher', action: 'Afficher le QR code', detail: 'M. David affiche le QR code en grand pour que les élèves scannent avec leur tablette.' },
        { who: 'student', action: 'Scanner et rejoindre', detail: 'Les élèves scannent le QR code. Leurs cartes apparaissent progressivement avec le statut Connecté.' },
        { who: 'teacher', action: 'Afficher les écrans', detail: 'Il clique sur « Afficher les écrans » pour voir l\'activité en temps réel sur chaque tablette.' },
        { who: 'teacher', action: 'Distribuer le cours', detail: 'Il envoie le PDF du cours à toute la classe via le bouton Envoyer.' },
        { who: 'student', action: 'Consulter la ressource', detail: 'Chloé reçoit la notification et ouvre le PDF dans le panneau latéral.' },
      ],
    });

    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;

    // --- Step 1: Show QR code ---
    tl.add(() => setNarrationStep(0, 'QR code plein écran : le code est affiché en grand pour être facilement scanné depuis toute la salle. Le compteur en temps réel rassure l\'enseignant sur la progression des connexions. Le lien textuel offre une alternative pour les élèves ayant des difficultés avec le scan.'));
    tl.add(() => showScreen('teacher'));

    const qrOverlay = document.getElementById('p-qr-overlay');
    const qrCount = document.getElementById('p-qr-count');
    const cards = screens.teacher.querySelectorAll('.sc-ucard');
    const connCount = screens.teacher.querySelector('.p-conn-count');
    const disconnCount = screens.teacher.querySelector('.p-disconn-count');

    tl.add(() => {
      qrOverlay.classList.remove('hidden');
      gsap.fromTo(qrOverlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: smooth });
      gsap.fromTo(qrOverlay.querySelector('.sc-qr-content'), { scale: 0.96, y: 8 }, { scale: 1, y: 0, duration: 0.25, ease: smooth });
    }, '+=0.2');
    tl.add(() => {}, '+=0.4');

    // --- Step 2: Students join progressively ---
    tl.add(() => setNarrationStep(1, 'Progressive disclosure : les cartes élèves apparaissent une par une au fur et à mesure des connexions. Le statut « Connecté » / « Absent » donne un feedback immédiat. Le rythme staggered crée un sentiment de classe vivante qui se remplit.'));
    const connectOrder = [0,4,1,7,3,5,9,6,8,10,11,13,12,14,15,16,17,18,19,20,21,22];
    let connected = 0;

    connectOrder.forEach((idx, i) => {
      tl.add(() => {
        const card = cards[idx];
        if (!card) return;
        card.classList.remove('connecting');
        gsap.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: smooth });
        const status = card.querySelector('.sc-ucard-status');
        if (status) { status.textContent = 'Connecté'; status.className = 'sc-ucard-status connected-status'; }
        connected++;
        connCount.textContent = connected;
        disconnCount.textContent = 24 - connected;
        qrCount.textContent = connected;
      }, i * 0.06 + 0.2);
    });

    // Marius late
    tl.add(() => {
      const marius = cards[2];
      if (marius) {
        gsap.to(marius, { opacity: 0.6, scale: 1, y: 0, duration: 0.3 });
        marius.classList.remove('connecting');
        const s = marius.querySelector('.sc-ucard-status');
        if (s) { s.textContent = 'Absent'; s.className = 'sc-ucard-status absent-status'; }
      }
      connCount.textContent = '22';
      disconnCount.textContent = '2';
    }, '+=0.3');

    // Marius arrives late
    tl.add(() => {
      const marius = cards[2];
      if (marius) {
        gsap.to(marius, { opacity: 1, duration: 0.3 });
        const s = marius.querySelector('.sc-ucard-status');
        if (s) { s.textContent = 'Connecté'; s.className = 'sc-ucard-status connected-status'; }
        gsap.fromTo(marius, { scale: 0.97 }, { scale: 1, duration: 0.25, ease: iosSpring });
      }
      connCount.textContent = '23';
      disconnCount.textContent = '1';
      qrCount.textContent = '23';
    }, '+=0.6');

    // Close QR
    tl.add(() => {
      gsap.to(qrOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => qrOverlay.classList.add('hidden') });
    }, '+=0.5');
    tl.add(() => {}, '+=0.5');

    // --- Step 3: Show screens ---
    tl.add(() => setNarrationStep(2, 'Séparation connexion / supervision : les cartes montrent d\'abord les noms et statuts de connexion. L\'affichage des écrans est une action délibérée (« Afficher les écrans »), évitant de surcharger l\'enseignant dès l\'ouverture de la classe.'));
    const showScreensBtn = document.getElementById('p-btn-show-screens');
    tl.add(() => moveCursor(showScreensBtn, null));
    tl.add(() => {
      showScreensBtn.classList.add('active');
      cards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.remove('no-screen');
          const sc = card.querySelector('.sc-screen-content');
          if (sc) gsap.fromTo(sc, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.35, ease: iosSpring });
          const status = card.querySelector('.sc-ucard-status');
          if (status && status.textContent === 'Connecté') { status.textContent = 'Actif'; status.className = 'sc-ucard-status active-status'; }
        }, i * 35);
      });
    }, '+=0.15');
    tl.add(() => {}, '+=1.2');

    // --- Step 4: Send resource ---
    tl.add(() => setNarrationStep(3, 'Action contextuelle : le bouton « Envoyer » est toujours visible dans la barre d\'actions. Le modal de confirmation évite les envois accidentels. Le feedback visuel (badge « Reçu ») sur chaque carte confirme la distribution.'));
    const shareDocBtn = document.getElementById('p-btn-share-doc');
    tl.add(() => moveCursor(shareDocBtn, null));
    tl.add(() => { shareDocBtn.classList.add('active-btn'); }, '+=0.15');

    const sendOverlay = document.getElementById('p-send-overlay');
    tl.add(() => {
      sendOverlay.classList.remove('hidden');
      gsap.fromTo(sendOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(sendOverlay.querySelector('.sc-send-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: smooth });
    }, '+=0.2');

    const confirmBtn = document.getElementById('p-send-confirm');
    tl.add(() => moveCursor(confirmBtn, null), '+=0.5');
    tl.add(() => {
      const check = document.getElementById('p-send-check');
      check.classList.remove('hidden');
      gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.3, ease: smooth });
    }, '+=0.15');
    tl.add(() => {
      gsap.to(sendOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => sendOverlay.classList.add('hidden') });
      shareDocBtn.classList.remove('active-btn');
    }, '+=0.5');

    // Received doc badges
    tl.add(() => {
      showReceivedBadge(cards, 'pdf', 'Cours_Egypte.pdf');
    }, '+=0.3');
    tl.add(() => {}, '+=1.5');

    // --- Ellipse: Teacher → Student (resource sent) ---
    tl.add(() => showEllipse({
      direction: 'teacher-to-student',
      action: 'Envoie le PDF du cours',
      result: 'Chloé reçoit la notification sur sa tablette',
      duration: 2.5
    }));
    tl.add(() => {}, '+=2.8');

    // --- Step 5: Student receives and opens resource ---
    tl.add(() => setNarrationStep(4, 'Panneau latéral glissant : la ressource s\'ouvre en superposition sans quitter la vue principale. L\'élève garde le contexte de sa séance. Le geste de retour (chevron) est cohérent avec les conventions iOS/iPadOS de navigation.'));
    tl.add(() => showScreen('student'));
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '15%' });

    const toast = document.getElementById('p-toast');
    tl.add(() => {
      toast.classList.remove('hidden');
      gsap.fromTo(toast, { y: -30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: iosSpring });
    }, '+=0.4');
    tl.add(() => {}, '+=1');

    const pdfRes = screens.student.querySelector('[data-res="pdf"]');
    tl.add(() => moveCursor(pdfRes, null));
    tl.add(() => { pdfRes.classList.add('highlight'); }, '+=0.1');
    tl.add(() => openResPanel('pdf'), '+=0.25');

    tl.to('#p-session-fill', { width: '30%', duration: 2, ease: smooth }, '+=0.3');
    tl.add(() => {
      gsap.to(toast, { y: -20, opacity: 0, duration: 0.3, ease: smooth, onComplete: () => toast.classList.add('hidden') });
    }, '-=1.5');

    tl.add(() => { pdfRes.classList.remove('highlight'); closeResPanel(); }, '+=1');
    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // SCENARIO 2: Observer et intervenir en temps réel
  // ============================================================
  function playSC2() {
    resetAll();
    hideNarration();

    showNarration({
      label: 'Scénario 2',
      title: 'Observer et intervenir',
      situation: 'En milieu de séance, M. David observe que certains élèves ne travaillent plus sur la tâche demandée. Il veut vérifier les écrans, verrouiller les tablettes des élèves distraits, puis consulter les messages reçus pour comprendre les blocages.',
      characters: [
        { name: 'Thomas David', initials: 'TD', color: '#3b82f6', role: 'Enseignant — surveille l\'activité' },
        { name: 'Ravi Singh', initials: 'RS', color: '#f97316', role: 'Élève — a une question' },
        { name: 'Emma Durand', initials: 'ED', color: '#ef4444', role: 'Élève — distraite sur Wikipedia' },
      ],
      steps: [
        { who: 'teacher', action: 'Basculer en vue écrans', detail: 'M. David clique sur le bouton moniteur pour voir les écrans de tous les élèves.' },
        { who: 'teacher', action: 'Repérer un élève distrait', detail: 'Il voit qu\'Emma navigue sur un site hors-sujet. Un badge rouge d\'alerte apparaît.' },
        { who: 'teacher', action: 'Verrouiller les écrans', detail: 'Il verrouille toutes les tablettes pour recentrer la classe.' },
        { who: 'student', action: 'Voir son écran verrouillé', detail: 'Emma voit son écran grisé avec le message de verrouillage.' },
        { who: 'teacher', action: 'Consulter les messages', detail: 'M. David lit les messages : Ravi a posé une question et attend une réponse.' },
        { who: 'teacher', action: 'Déverrouiller', detail: 'Il déverrouille les tablettes et reprend le cours.' },
      ],
    });

    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;

    // Start on active screen
    tl.add(() => setNarrationStep(0, 'Vue d\'ensemble par miniatures : chaque carte affiche un aperçu en temps réel de l\'écran de l\'élève. Cette transparence permet à l\'enseignant de superviser sans se déplacer physiquement. Le grid 6 colonnes optimise la densité d\'information.'));
    setupActiveScreen();

    // Unified grid already shows screens — just highlight
    const screenCards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {}, '+=0.5');

    // Step 2: Spot distracted student
    tl.add(() => setNarrationStep(1, 'Signalétique par couleur : les bordures colorées (vert = terminé, rouge = alerte, bleu = actif) sont un code visuel universel qui ne nécessite pas de lecture. L\'enseignant repère instantanément les situations qui requièrent son attention.'));
    tl.add(() => {
      [3, 7].forEach(i => screenCards[i]?.classList.add('border-green'));
      [4].forEach(i => screenCards[i]?.classList.add('border-red'));
      [0, 8, 5].forEach(i => screenCards[i]?.classList.add('border-blue'));
    }, '+=0.3');
    tl.add(() => {}, '+=1.2');

    // Step 3: Lock screens
    tl.add(() => setNarrationStep(2, 'Verrouillage non-bloquant : contrairement à un overlay plein écran, le verrouillage garde la vue enseignant intacte. L\'enseignant conserve le contrôle total (envoyer des ressources, déverrouiller individuellement). Le banner flottant signale l\'état sans masquer l\'information.'));
    const lockBtn = document.getElementById('p-btn-lock');
    tl.add(() => moveCursor(lockBtn, null));
    tl.add(() => { lockBtn.classList.add('active-btn'); }, '+=0.12');

    tl.add(() => {
      screenCards.forEach((card, i) => {
        const screenContent = card.querySelector('.sc-screen-content');
        const screenOff = card.querySelector('.sc-screen-off');
        const status = card.querySelector('.sc-ucard-status');
        if (status) { status.dataset.originalText = status.textContent; }
        gsap.to(screenContent, { opacity: 0, scale: 0.95, duration: 0.3, delay: i * 0.04, ease: smooth });
        gsap.to(screenOff, { opacity: 1, duration: 0.3, delay: i * 0.04 + 0.1, ease: smooth });
        setTimeout(() => {
          card.classList.remove('border-blue', 'border-green', 'border-red');
          card.classList.add('locked');
          if (status) { status.textContent = 'Verrouillé'; status.style.background = '#fef2f2'; status.style.color = '#ef4444'; }
        }, i * 40 + 150);
      });
    }, '+=0.3');
    tl.add(() => {}, '+=1');

    // --- Ellipse: Teacher → Student (lock) ---
    tl.add(() => showEllipse({
      direction: 'teacher-to-student',
      action: 'Verrouille les écrans',
      result: 'Les tablettes affichent le message de verrouillage',
      duration: 2.2
    }));
    tl.add(() => {}, '+=2.5');

    // Step 4: Student sees lock
    tl.add(() => setNarrationStep(3, 'Feedback clair pour l\'élève : un écran verrouillé affiche un message explicite sans être punitif. Le ton neutre (« verrouillé par l\'enseignant ») contextualise la situation comme un acte pédagogique, pas une sanction.'));
    tl.add(() => showScreen('student'));
    gsap.set('#p-session-fill', { width: '55%' });
    const lock = document.getElementById('p-student-lock');
    tl.add(() => {
      lock.classList.remove('hidden');
      gsap.fromTo(lock, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: smooth });
    }, '+=0.3');
    tl.add(() => {}, '+=2');

    // Step 5: Check messages
    tl.add(() => setNarrationStep(4, 'Panneau de messages contextualisé : chaque message affiche l\'avatar de l\'élève, le contenu, et un horodatage. Les emojis sémantiques (pouce, question, check) permettent un tri visuel instantané. L\'enseignant peut prioriser les urgences.'));
    tl.add(() => {
      gsap.to(lock, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => lock.classList.add('hidden') });
    });
    tl.add(() => showScreen('active'), '+=0.3');

    const messagesPanel = document.getElementById('p-messages-panel');
    const msgBadgeS = document.getElementById('p-msg-badge');
    if (msgBadgeS) { msgBadgeS.classList.remove('hidden'); msgBadgeS.textContent = '3'; }
    const msgBtnS = document.getElementById('p-btn-messages');
    tl.add(() => moveCursor(msgBtnS, null), '+=0.3');
    tl.add(() => { openMessagesPanel(); }, '+=0.2');
    tl.add(() => {}, '+=1.5');

    // Step 6: Unlock
    tl.add(() => setNarrationStep(5, 'Réversibilité immédiate : le déverrouillage est aussi simple que le verrouillage — un seul clic sur le même bouton. Ce pattern symétrique réduit la charge cognitive et encourage l\'enseignant à utiliser le verrouillage comme un outil courant, pas une mesure exceptionnelle.'));
    tl.add(() => {
      closeMessagesPanel();
      lockBtn.classList.remove('active-btn');
    });
    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // SCENARIO 3: Différencier les parcours d'apprentissage
  // ============================================================
  function playSC3() {
    resetAll();
    hideNarration();

    showNarration({
      label: 'Scénario 3',
      title: 'Différencier les parcours',
      situation: 'M. David veut proposer un parcours adapté à chaque niveau. Il crée un groupe « Approfondissement » avec les élèves avancés, leur envoie un exercice supplémentaire, puis vérifie que les autres élèves consultent bien le cours de base.',
      characters: [
        { name: 'Thomas David', initials: 'TD', color: '#3b82f6', role: 'Enseignant — différencie les tâches' },
        { name: 'Lucas Faure', initials: 'LF', color: '#8b5cf6', role: 'Élève avancé — groupe Approfondissement' },
        { name: 'Aya Bouchami', initials: 'AB', color: '#22c55e', role: 'Élève — suit le parcours standard' },
      ],
      steps: [
        { who: 'teacher', action: 'Créer un groupe', detail: 'M. David crée le groupe « Approfondissement » et sélectionne 5 élèves avancés.' },
        { who: 'teacher', action: 'Envoyer un exercice ciblé', detail: 'Il envoie un document supplémentaire uniquement au groupe.' },
        { who: 'student', action: 'Recevoir l\'exercice', detail: 'Lucas reçoit une notification et ouvre l\'exercice d\'approfondissement.' },
        { who: 'teacher', action: 'Observer les élèves standard', detail: 'M. David revient sur la vue globale et vérifie que les autres élèves travaillent sur le cours.' },
        { who: 'student', action: 'Signaler « J\'ai terminé »', detail: 'Aya termine le cours standard et envoie le message à l\'enseignant.' },
      ],
    });

    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;

    // Step 1: Create group
    tl.add(() => setNarrationStep(0, 'Sélection par chips : la grille de sélection utilise des avatars colorés pour faciliter l\'identification visuelle. Le pattern de multi-sélection avec bordure bleue donne un feedback immédiat sur les élèves sélectionnés. Le nombre de groupes n\'est pas limité.'));
    setupActiveScreen();

    const createGroupBtn = document.getElementById('p-btn-create-group');
    const groupOverlay = document.getElementById('p-group-overlay');
    const chips = document.querySelectorAll('.sc-group-chip');

    tl.add(() => moveCursor(createGroupBtn, null), '+=0.3');
    tl.add(() => { createGroupBtn.classList.add('active-btn'); }, '+=0.15');

    tl.add(() => {
      groupOverlay.classList.remove('hidden');
      gsap.fromTo(groupOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(groupOverlay.querySelector('.sc-group-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.2');

    [0, 5, 7, 10, 2].forEach((idx, i) => {
      tl.add(() => {
        const chip = chips[idx];
        if (chip) { chip.classList.add('selected'); gsap.fromTo(chip, { scale: 0.95 }, { scale: 1, duration: 0.15, ease: smooth }); }
      }, i === 0 ? '+=0.4' : '+=0.2');
    });

    const groupConfirm = document.getElementById('p-group-confirm');
    tl.add(() => moveCursor(groupConfirm, null), '+=0.3');
    tl.add(() => {
      gsap.to(groupOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => groupOverlay.classList.add('hidden') });
      createGroupBtn.classList.remove('active-btn');
    }, '+=0.15');

    // New pill
    tl.add(() => {
      const groupBar = screens.teacher.querySelector('.sc-group-bar');
      const addBtn = document.getElementById('p-btn-group-add');
      const pill = document.createElement('button');
      pill.className = 'sc-group-pill';
      pill.textContent = 'Approfondissement';
      groupBar.insertBefore(pill, addBtn);
      gsap.fromTo(pill, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: iosSpring });
    }, '+=0.2');
    tl.add(() => {}, '+=0.8');

    // Step 2: Send targeted resource
    tl.add(() => setNarrationStep(1, 'Envoi ciblé vs envoi global : le même workflow d\'envoi de ressource est réutilisé, mais le contexte de groupe filtre automatiquement les destinataires. La cohérence du pattern rassure l\'enseignant — pas de nouvelle interface à apprendre.'));
    const shareDocBtn = document.getElementById('p-btn-share-doc');
    tl.add(() => moveCursor(shareDocBtn, null));
    tl.add(() => { shareDocBtn.classList.add('active-btn'); }, '+=0.15');

    const sendOverlay = document.getElementById('p-send-overlay');
    tl.add(() => {
      sendOverlay.classList.remove('hidden');
      gsap.fromTo(sendOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(sendOverlay.querySelector('.sc-send-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: smooth });
    }, '+=0.2');
    const confirmBtn = document.getElementById('p-send-confirm');
    tl.add(() => moveCursor(confirmBtn, null), '+=0.5');
    tl.add(() => {
      const check = document.getElementById('p-send-check');
      check.classList.remove('hidden');
      gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.3, ease: smooth });
    }, '+=0.15');
    tl.add(() => {
      gsap.to(sendOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => sendOverlay.classList.add('hidden') });
      shareDocBtn.classList.remove('active-btn');
    }, '+=0.5');
    tl.add(() => {}, '+=0.8');

    // Step 3: Student receives
    tl.add(() => setNarrationStep(2, 'Cohérence élève-enseignant : l\'élève retrouve le même pattern de notification toast et le même panneau de ressources. La continuité visuelle entre les deux interfaces réduit la confusion et accélère l\'adoption.'));
    tl.add(() => showScreen('student'));
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '40%' });

    const toast = document.getElementById('p-toast');
    tl.add(() => {
      toast.classList.remove('hidden');
      gsap.fromTo(toast, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: iosSpring });
    }, '+=0.4');
    tl.add(() => {}, '+=1');

    const pdfRes = screens.student.querySelector('[data-res="pdf"]');
    tl.add(() => moveCursor(pdfRes, null));
    tl.add(() => { pdfRes.classList.add('highlight'); }, '+=0.1');
    tl.add(() => openResPanel('pdf'), '+=0.25');
    tl.add(() => {
      gsap.to(toast, { y: -20, opacity: 0, duration: 0.3, ease: smooth, onComplete: () => toast.classList.add('hidden') });
    }, '+=0.5');
    tl.add(() => {}, '+=1');

    // Step 4: Teacher observes
    tl.add(() => setNarrationStep(3, 'Vue d\'ensemble toujours accessible : l\'enseignant peut revenir à la vue globale à tout moment. Les badges d\'interaction persistent même quand il change de vue, assurant la continuité de l\'information.'));
    tl.add(() => { pdfRes.classList.remove('highlight'); closeResPanel(); });
    tl.add(() => showScreen('active'), '+=0.3');

    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    [{ idx: 3, type: 'badge-done' }, { idx: 7, type: 'badge-done' }, { idx: 11, type: 'badge-done' }].forEach(bd => {
      const card = ucards[bd.idx];
      if (card) {
        const badge = card.querySelector('.sc-interaction-badge');
        if (badge) { badge.className = 'sc-interaction-badge ' + bd.type; badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>'; card.classList.add('badge-active'); }
      }
    });
    tl.add(() => {}, '+=1.5');

    // Step 5: Student signals done
    tl.add(() => setNarrationStep(4, 'Messages pré-définis (chips) : les boutons-messages évitent à l\'élève de taper du texte, réduisant les distractions et la perte de temps. Le vocabulaire limité et positif (« j\'ai terminé », « j\'ai compris ») encourage la communication pédagogique.'));
    tl.add(() => showScreen('student'));
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '85%' });

    const chip = screens.student.querySelector('[data-msg="termine"]');
    tl.add(() => moveCursor(chip, null), '+=0.3');
    tl.add(() => { chip.classList.add('selected'); }, '+=0.1');
    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null), '+=0.3');
    tl.to(sendBtn, { scale: 0.96, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.2, ease: smooth });

    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => { gsap.to(msgPanel, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => { msgPanel.style.display = 'none'; } }); }, '+=0.15');
    tl.add(() => { confirm.classList.remove('hidden'); gsap.fromTo(confirm, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth }); }, '+=0.1');
    tl.to('#p-session-fill', { width: '100%', duration: 0.8, ease: smooth }, '-=0.2');
    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // SCENARIO 4: Évaluer en direct
  // ============================================================
  function playSC4() {
    resetAll();
    hideNarration();

    showNarration({
      label: 'Scénario 4',
      title: 'Évaluer en direct',
      situation: 'Avant de passer au chapitre suivant, M. David veut vérifier que la majorité de la classe a compris la notion de force gravitationnelle. Il lance un sondage rapide, analyse les résultats en temps réel, et projette les résultats à toute la classe.',
      characters: [
        { name: 'Thomas David', initials: 'TD', color: '#3b82f6', role: 'Enseignant — évalue la compréhension' },
        { name: 'Chloé Dupont', initials: 'CD', color: '#ec4899', role: 'Élève — a bien compris' },
        { name: 'Nolan Garnier', initials: 'NG', color: '#6366f1', role: 'Élève — n\'a pas compris' },
      ],
      steps: [
        { who: 'teacher', action: 'Lancer un sondage', detail: 'M. David ouvre le sondage rapide avec une question sur la force gravitationnelle.' },
        { who: 'teacher', action: 'Observer les réponses', detail: 'Les résultats arrivent en temps réel : barres de progression et pourcentages.' },
        { who: 'teacher', action: 'Analyser les résultats', detail: '52% ont compris, 30% partiellement, 18% n\'ont pas compris du tout.' },
        { who: 'teacher', action: 'Projeter les résultats', detail: 'M. David partage son écran pour montrer les résultats à la classe et en discuter.' },
      ],
    });

    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;

    // Step 1: Launch poll
    tl.add(() => setNarrationStep(0, 'Sondage intégré : pas besoin d\'outil externe (Google Forms, Kahoot). Le sondage est natif à l\'interface, réduisant les frictions. Les options pré-formatées (oui/partiellement/non) couvrent l\'essentiel de l\'évaluation formative.'));
    setupActiveScreen();

    const pollOverlay = document.getElementById('p-poll-overlay');
    tl.add(() => {
      pollOverlay.classList.remove('hidden');
      gsap.fromTo(pollOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(pollOverlay.querySelector('.sc-poll-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.3');

    const launchBtn = document.getElementById('p-poll-launch');
    tl.add(() => moveCursor(launchBtn, null), '+=0.5');
    tl.add(() => {
      launchBtn.textContent = 'Sondage envoyé';
      launchBtn.style.background = '#34c759';
    }, '+=0.1');
    tl.add(() => {}, '+=0.3');

    // --- Ellipse: Teacher → Student (poll sent) ---
    tl.add(() => showEllipse({
      direction: 'teacher-to-student',
      action: 'Envoie le sondage de compréhension',
      result: 'Les élèves reçoivent le sondage et votent en temps réel',
      duration: 2
    }));
    tl.add(() => {}, '+=2.3');

    // --- Ellipse: Student → Teacher (responses) ---
    tl.add(() => showEllipse({
      direction: 'student-to-teacher',
      action: '23 élèves répondent au sondage',
      result: 'Les résultats s\'affichent en temps réel',
      duration: 2
    }));
    tl.add(() => {}, '+=2.3');

    // Step 2: Watch results
    tl.add(() => setNarrationStep(1, 'Feedback en temps réel : les barres de progression s\'animent au fur et à mesure que les réponses arrivent. Le compteur « X/23 réponses » crée un sentiment d\'urgence positive et permet à l\'enseignant de savoir quand tout le monde a répondu.'));
    const statusEl = document.getElementById('p-poll-status');
    const fills = pollOverlay.querySelectorAll('.sc-poll-fill');
    const pcts = pollOverlay.querySelectorAll('.sc-poll-pct');

    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 8/23 réponses';
      gsap.to(fills[0], { width: '50%', duration: 0.6, ease: smooth }); pcts[0].textContent = '50%';
      gsap.to(fills[1], { width: '30%', duration: 0.6, ease: smooth }); pcts[1].textContent = '25%';
      gsap.to(fills[2], { width: '20%', duration: 0.6, ease: smooth }); pcts[2].textContent = '25%';
    }, '+=0.5');
    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 18/23 réponses';
      gsap.to(fills[0], { width: '65%', duration: 0.6, ease: smooth }); pcts[0].textContent = '56%';
      gsap.to(fills[1], { width: '45%', duration: 0.6, ease: smooth }); pcts[1].textContent = '28%';
      gsap.to(fills[2], { width: '25%', duration: 0.6, ease: smooth }); pcts[2].textContent = '16%';
    }, '+=1');

    // Step 3: Analyze
    tl.add(() => setNarrationStep(2, 'Visualisation intuitive : le code couleur vert/orange/rouge associé aux barres de progression permet une lecture immédiate des résultats. L\'enseignant n\'a pas besoin d\'analyser des chiffres — le visuel parle de lui-même.'));
    tl.add(() => {
      statusEl.innerHTML = '<span class="sc-dot green"></span> 23/23 réponses';
      gsap.to(fills[0], { width: '70%', duration: 0.6, ease: smooth }); pcts[0].textContent = '52%';
      gsap.to(fills[1], { width: '50%', duration: 0.6, ease: smooth }); pcts[1].textContent = '30%';
      gsap.to(fills[2], { width: '30%', duration: 0.6, ease: smooth }); pcts[2].textContent = '18%';
    }, '+=0.8');
    tl.add(() => {}, '+=1.5');

    // Close poll
    tl.add(() => {
      gsap.to(pollOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => {
        pollOverlay.classList.add('hidden');
        launchBtn.textContent = 'Envoyer le sondage'; launchBtn.style.background = '';
        fills.forEach(f => f.style.width = '0%'); pcts.forEach(p => p.textContent = '0%');
        statusEl.innerHTML = '<span class="sc-dot green"></span> 0/23 réponses';
      }});
    });

    // Step 4: Project results
    tl.add(() => setNarrationStep(3, 'Projection sans changement d\'outil : le même bouton « Partager l\'écran » diffuse instantanément le contenu de l\'enseignant. La modal de projection montre un aperçu en direct et un statut de diffusion, donnant confiance que les élèves voient bien le contenu.'));

    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    tl.add(() => moveCursor(shareScreenBtn, null), '+=0.3');
    tl.add(() => { startProjection('Résultats du sondage'); }, '+=0.15');

    tl.add(() => {}, '+=2.5');

    const stopBtn = document.getElementById('p-btn-stop-project');
    tl.add(() => moveCursor(stopBtn, null));
    tl.add(() => { stopProjection(); }, '+=0.15');
    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // SCENARIO 5: Collaborer et rendre un travail
  // ============================================================
  function playSC5() {
    resetAll();
    hideNarration();

    showNarration({
      label: 'Scénario 5',
      title: 'Collaborer et rendre',
      situation: 'En fin de séance, les élèves doivent rendre leur travail. Chloé téléverse son devoir, Ravi a une question avant de rendre le sien. M. David répond à Ravi, projette le travail de Chloé comme exemple, et clôt la séance.',
      characters: [
        { name: 'Thomas David', initials: 'TD', color: '#3b82f6', role: 'Enseignant — accompagne le rendu' },
        { name: 'Chloé Dupont', initials: 'CD', color: '#ec4899', role: 'Élève — rend son travail' },
        { name: 'Ravi Singh', initials: 'RS', color: '#f97316', role: 'Élève — demande une clarification' },
      ],
      steps: [
        { who: 'student', action: 'Déposer un document', detail: 'Chloé glisse son fichier dans la zone de dépôt, le fichier s\'uploade avec une barre de progression.' },
        { who: 'student', action: 'Poser une question', detail: 'Ravi sélectionne « J\'ai une question » et envoie le message à l\'enseignant.' },
        { who: 'teacher', action: 'Voir les notifications', detail: 'M. David voit les badges d\'interaction : Chloé a terminé, Ravi a une question.' },
        { who: 'teacher', action: 'Répondre à Ravi', detail: 'M. David ouvre le message de Ravi et lui répond « Regarde la page 12 du cours ».' },
        { who: 'teacher', action: 'Projeter le travail de Chloé', detail: 'Il projette l\'écran pour montrer le travail exemplaire de Chloé à toute la classe.' },
      ],
    });

    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;

    // Step 1: Student uploads
    tl.add(() => setNarrationStep(0, 'Zone de dépôt (drag & drop) : le pattern de glisser-déposer est naturel sur tablette. Les états visuels progressifs (zone neutre → survol bleu → fichier déposé → barre de progression → confirmation verte) guident l\'élève à chaque étape sans instructions textuelles.'));
    tl.add(() => showScreen('student'));
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '75%' });

    const uploadZone = document.getElementById('p-upload-zone');
    const droppedFile = document.getElementById('p-dropped-file');
    const progressBar = document.getElementById('p-upload-progress');
    const progressFill = document.getElementById('p-upload-fill');
    const btnSendFile = document.getElementById('p-btn-send-file');
    const uploaded = document.getElementById('p-uploaded-file');

    tl.add(() => moveCursor(uploadZone, null), '+=0.3');
    tl.add(() => { uploadZone.classList.add('drag-over'); gsap.to(uploadZone, { scale: 1.01, duration: 0.25, ease: smooth }); }, '+=0.15');
    tl.add(() => { uploadZone.classList.remove('drag-over'); gsap.to(uploadZone, { scale: 1, opacity: 0, duration: 0.2, ease: smooth, onComplete: () => { uploadZone.style.display = 'none'; } }); }, '+=0.4');
    tl.add(() => { droppedFile.classList.remove('hidden'); gsap.fromTo(droppedFile, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth }); }, '+=0.15');
    tl.add(() => moveCursor(btnSendFile, null), '+=0.3');
    tl.add(() => {
      btnSendFile.style.display = 'none';
      progressBar.classList.remove('hidden');
    }, '+=0.15');
    tl.to(progressFill, { width: '100%', duration: 0.8, ease: smooth }, '+=0.1');
    tl.add(() => { gsap.to(droppedFile, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => droppedFile.classList.add('hidden') }); }, '+=0.2');
    tl.add(() => { uploaded.classList.remove('hidden'); gsap.fromTo(uploaded, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth }); }, '+=0.15');
    tl.add(() => {}, '+=0.8');

    // Step 2: Another student asks question
    tl.add(() => setNarrationStep(1, 'Vocabulaire limité et bienveillant : les messages pré-définis (« J\'ai une question ») normalisent la demande d\'aide. L\'élève n\'a pas à formuler sa question par écrit, réduisant la barrière sociale. Le message est envoyé de manière asynchrone sans interrompre la classe.'));
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '70%' });
    const questionChip = screens.student.querySelector('[data-msg="question"]');
    tl.add(() => moveCursor(questionChip, null), '+=0.3');
    tl.add(() => { questionChip.classList.add('selected'); }, '+=0.1');
    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null), '+=0.3');
    tl.to(sendBtn, { scale: 0.96, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.2, ease: smooth });
    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => { gsap.to(msgPanel, { opacity: 0, duration: 0.2, ease: smooth, onComplete: () => { msgPanel.style.display = 'none'; } }); }, '+=0.15');
    tl.add(() => { confirm.classList.remove('hidden'); gsap.fromTo(confirm, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth }); }, '+=0.1');
    tl.add(() => {}, '+=0.8');

    // --- Ellipse: Student → Teacher (upload + question) ---
    tl.add(() => showEllipse({
      direction: 'student-to-teacher',
      action: 'Chloé rend son devoir, Ravi pose une question',
      result: 'Les badges d\'interaction apparaissent sur le tableau de bord',
      duration: 2.5
    }));
    tl.add(() => {}, '+=2.8');

    // Step 3: Teacher sees notifications
    tl.add(() => setNarrationStep(2, 'Badges comme système nerveux : les badges colorés sur les cartes élèves fonctionnent comme un tableau de bord en temps réel. L\'enseignant voit d\'un coup d\'œil qui a terminé (vert), qui a besoin d\'aide (orange), et peut prioriser ses interventions.'));
    tl.add(() => showScreen('active'));
    setupActiveScreen();
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');

    tl.add(() => {
      // Chloé done
      const chloeCard = ucards[4];
      if (chloeCard) {
        const badge = chloeCard.querySelector('.sc-interaction-badge');
        if (badge) { badge.className = 'sc-interaction-badge badge-done'; badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>'; chloeCard.classList.add('badge-active'); gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.25, ease: iosSpring }); }
      }
      // Ravi question
      const raviCard = ucards[9];
      if (raviCard) {
        const badge = raviCard.querySelector('.sc-interaction-badge');
        if (badge) { badge.className = 'sc-interaction-badge badge-question'; badge.innerHTML = '<i class="ph-fill ph-question" style="font-size:11px"></i>'; raviCard.classList.add('badge-active'); gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.25, delay: 0.2, ease: iosSpring }); }
      }
    }, '+=0.5');
    tl.add(() => {}, '+=1.2');

    // Step 4: Reply to Ravi
    tl.add(() => setNarrationStep(3, 'Réponse rapide contextuelle : la modal de réponse pré-remplit le contexte (nom de l\'élève, son message). Les chips de réponse rapide (OK, Patience, Voir le cours) accélèrent la réponse sans saisie clavier. L\'enseignant peut aussi taper un message personnalisé.'));
    const raviCard2 = ucards[9];
    tl.add(() => moveCursor(raviCard2, null));

    const replyOverlay = document.getElementById('p-reply-overlay');
    tl.add(() => {
      replyOverlay.classList.remove('hidden');
      gsap.fromTo(replyOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(replyOverlay.querySelector('.sc-reply-modal'), { scale: 0.95, y: 15 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.2');
    tl.add(() => {}, '+=0.8');

    const replySend = document.getElementById('p-reply-send');
    tl.add(() => moveCursor(replySend, null));
    tl.add(() => {
      gsap.to(replyOverlay, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => replyOverlay.classList.add('hidden') });
    }, '+=0.15');

    // Badge changes
    tl.add(() => {
      if (raviCard2) {
        const badge = raviCard2.querySelector('.sc-interaction-badge');
        if (badge) { badge.className = 'sc-interaction-badge badge-understood'; badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>'; gsap.fromTo(badge, { scale: 0.5 }, { scale: 1, duration: 0.25, ease: iosSpring }); }
      }
    }, '+=0.3');
    tl.add(() => {}, '+=0.8');

    // Step 5: Project Chloé's work
    tl.add(() => setNarrationStep(4, 'Valorisation du travail élève : projeter le travail d\'un élève comme exemple positif renforce la motivation intrinsèque. Le pattern de projection est le même que pour l\'écran enseignant, mais le contexte pédagogique change : montrer → valoriser → inspirer.'));
    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    tl.add(() => moveCursor(shareScreenBtn, null));
    tl.add(() => { startProjection('Travail de Chloé'); }, '+=0.15');
    tl.add(() => {}, '+=2');

    const stopBtn = document.getElementById('p-btn-stop-project');
    tl.add(() => moveCursor(stopBtn, null));
    tl.add(() => { stopProjection(); }, '+=0.15');
    tl.add(() => {}, '+=1');
  }

  // ============================================================
  // SCENARIO 6: Scanner un document et le distribuer
  // ============================================================
  function playSC6() {
    resetAll();
    hideNarration();
    showNarration({
      label: 'Scénario 6', title: 'Scanner et distribuer un document papier',
      situation: 'Monsieur Julien a un exercice papier qu\'il veut distribuer numériquement. Il scanne le document, le convertit en PDF et l\'envoie à toute la classe.',
      characters: [
        { name: 'Julien Moreau', initials: 'JM', color: '#3b82f6', role: 'Enseignant' },
        { name: 'Léa Martin', initials: 'LM', color: '#ec4899', role: 'Élève' },
      ],
      steps: [
        { who: 'teacher', action: 'Activer le scanner', detail: 'Monsieur Julien clique sur Scanner dans la barre d\'actions.' },
        { who: 'teacher', action: 'Photographier le document', detail: 'Il prend en photo l\'exercice posé sur son bureau.' },
        { who: 'teacher', action: 'Numériser en PDF', detail: 'Le système recadre, corrige la perspective et convertit en PDF.' },
        { who: 'teacher', action: 'Envoyer à la classe', detail: 'Il envoie le PDF sur toutes les tablettes en un clic.' },
        { who: 'student', action: 'Recevoir le document', detail: 'Léa voit le badge « Reçu » apparaître et ouvre l\'exercice.' },
      ],
    });
    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;
    tl.add(() => setNarrationStep(0, 'Accès direct depuis la barre d\'actions : pas besoin de quitter l\'interface pour scanner un document.'));
    setupActiveScreen();
    // Reuse T14 scan flow
    const scanBtn = document.getElementById('p-btn-scan');
    tl.add(() => moveCursor(scanBtn, null), '+=0.3');
    tl.add(() => { scanBtn.classList.add('active-btn'); }, '+=0.15');
    const scanOverlay = document.getElementById('p-scan-overlay');
    tl.add(() => {
      scanOverlay.classList.remove('hidden');
      gsap.fromTo(scanOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
    }, '+=0.2');
    tl.add(() => setNarrationStep(1, 'Capture directe : la caméra s\'active instantanément avec un viseur. Le flash simule la prise de photo.'), '+=0.8');
    tl.add(() => setNarrationStep(2, 'Traitement automatique : recadrage, correction de perspective, amélioration du contraste et conversion PDF — tout est automatisé.'), '+=1.2');
    tl.add(() => setNarrationStep(3, 'Envoi natif : le même bouton « Envoyer » que pour les autres ressources. Cohérence de l\'interface.'), '+=1.2');
    tl.add(() => {
      gsap.to(scanOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => scanOverlay.classList.add('hidden') });
      scanBtn.classList.remove('active-btn');
    }, '+=0.5');
    tl.add(() => setNarrationStep(4, 'Feedback immédiat : les badges documentaires confirment que chaque élève a bien reçu le fichier.'));
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {
      showReceivedBadge(ucards, 'pdf', 'Exercice.pdf');
    }, '+=0.3');
    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // SCENARIO 7: Lancer et surveiller un examen officiel
  // ============================================================
  function playSC7() {
    resetAll();
    hideNarration();
    showNarration({
      label: 'Scénario 7', title: 'Examen officiel de bout en bout',
      situation: 'Jour d\'examen. Monsieur Julien doit lancer le bac blanc de physique, surveiller 32 élèves pendant 4 heures, récupérer les copies et les transmettre aux autorités.',
      characters: [
        { name: 'Julien Moreau', initials: 'JM', color: '#3b82f6', role: 'Enseignant surveillant' },
        { name: 'Emma Durand', initials: 'ED', color: '#ef4444', role: 'Élève — termine en avance' },
        { name: 'Nolan Garnier', initials: 'NG', color: '#6366f1', role: 'Élève — reste jusqu\'au bout' },
      ],
      steps: [
        { who: 'teacher', action: 'Ouvrir la session d\'examen', detail: 'Monsieur Julien accède à la séance programmée depuis l\'index.' },
        { who: 'teacher', action: 'Vérifier les restrictions', detail: 'Il confirme que toutes les restrictions MDM sont actives.' },
        { who: 'teacher', action: 'Lancer l\'examen', detail: 'L\'examen démarre, les sujets sont distribués automatiquement.' },
        { who: 'teacher', action: 'Surveiller les copies', detail: 'Il observe les élèves en temps réel. Emma termine en avance.' },
        { who: 'teacher', action: 'Récupérer et transmettre', detail: 'Il collecte les copies, les sauvegarde et les envoie par email.' },
      ],
    });
    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;
    tl.add(() => setNarrationStep(0, 'Index des séances : l\'examen programmé est visible directement dans la liste, avec un badge « Examen officiel ».'));
    tl.add(() => showScreen('sessions'));
    const rows = document.querySelectorAll('.sc-session-row');
    rows.forEach(r => gsap.set(r, { opacity: 0, y: 12 }));
    tl.add(() => { rows.forEach((r, i) => gsap.to(r, { opacity: 1, y: 0, duration: 0.25, delay: i * 0.04, ease: springS })); }, '+=0.3');
    tl.add(() => {}, '+=1');
    tl.add(() => setNarrationStep(1, 'Restrictions verrouillées par l\'administration : l\'enseignant vérifie mais ne peut pas modifier les paramètres de sécurité.'));
    const examOverlay = document.getElementById('p-exam-overlay');
    tl.add(() => {
      examOverlay.classList.remove('hidden');
      gsap.fromTo(examOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(examOverlay.querySelector('.sc-exam-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => {}, '+=1.5');
    tl.add(() => setNarrationStep(2, 'Lancement sécurisé : un seul clic pour démarrer. Les sujets chiffrés sont déverrouillés et distribués automatiquement.'));
    tl.add(() => {
      gsap.to(examOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => examOverlay.classList.add('hidden') });
    }, '+=0.5');
    tl.add(() => setNarrationStep(3, 'Surveillance en temps réel : grille sombre pour limiter la fatigue visuelle. Les statuts changent en direct (en cours → terminé → inactif).'));
    const survOverlay = document.getElementById('p-exam-surv-overlay');
    const examGrid = document.getElementById('p-exam-grid');
    examGrid.innerHTML = '';
    ['ALLARD T.','BOUCHAMI A.','CHEN W.','DUPONT C.','DURAND E.','FAURE L.','GARNIER N.','GIRARD M.'].forEach(n => {
      const card = document.createElement('div');
      card.className = 'sc-exam-card';
      card.innerHTML = `<div class="sc-exam-card-screen"><div class="sc-screen-content" style="background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:8px;color:#475569">Examen</div></div><div class="sc-exam-card-footer"><span class="sc-exam-card-name">${n}</span><span class="sc-exam-card-status working">En cours</span></div>`;
      examGrid.appendChild(card);
    });
    showScreen('teacher', true);
    tl.add(() => {
      survOverlay.classList.remove('hidden');
      gsap.fromTo(survOverlay, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: smooth });
    }, '+=0.3');
    tl.add(() => {}, '+=1.5');
    tl.add(() => setNarrationStep(4, 'Workflow complet : collecte → sauvegarde locale → Google Drive → email aux autorités. Tout depuis la même interface.'));
    tl.add(() => {
      gsap.to(survOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => survOverlay.classList.add('hidden') });
    }, '+=0.5');
    const recapOverlay = document.getElementById('p-exam-recap-overlay');
    tl.add(() => {
      recapOverlay.classList.remove('hidden');
      gsap.fromTo(recapOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      gsap.fromTo(recapOverlay.querySelector('.sc-exam-recap-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // SCENARIO 8: Mode devoir en classe
  // ============================================================
  function playSC8() {
    resetAll();
    hideNarration();
    showNarration({
      label: 'Scénario 8', title: 'Contrôle surprise en classe',
      situation: 'Monsieur Julien décide de lancer un contrôle de 30 minutes. Il configure les restrictions, distribue le sujet, surveille la progression et récupère les copies à la fin du temps imparti.',
      characters: [
        { name: 'Julien Moreau', initials: 'JM', color: '#3b82f6', role: 'Enseignant' },
        { name: 'Chloé Dupont', initials: 'CD', color: '#ec4899', role: 'Élève — rapide et efficace' },
        { name: 'Ravi Singh', initials: 'RS', color: '#f97316', role: 'Élève — prend son temps' },
      ],
      steps: [
        { who: 'teacher', action: 'Ouvrir le mode devoir', detail: 'Monsieur Julien ouvre la configuration du mode devoir depuis la séance active.' },
        { who: 'teacher', action: 'Configurer les restrictions', detail: 'Il bloque internet, désactive les messages et verrouille les applications.' },
        { who: 'teacher', action: 'Distribuer le devoir', detail: 'Le sujet est envoyé et le minuteur démarre automatiquement.' },
        { who: 'student', action: 'Travailler et rendre', detail: 'Chloé termine en 20 minutes. Ravi travaille jusqu\'au bout des 30 minutes.' },
      ],
    });
    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;
    tl.add(() => setNarrationStep(0, 'Activation depuis la séance : pas besoin de quitter la vue classe. Le mode devoir est une surcouche.'));
    setupActiveScreen();
    const assignOverlay = document.getElementById('p-assignment-overlay');
    tl.add(() => {
      assignOverlay.classList.remove('hidden');
      gsap.fromTo(assignOverlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(assignOverlay.querySelector('.sc-assignment-modal'), { scale: 0.95, y: 20 }, { scale: 1, y: 0, duration: 0.35, ease: iosSpring });
    }, '+=0.3');
    tl.add(() => setNarrationStep(1, 'Restrictions granulaires : chaque restriction est un toggle indépendant. L\'enseignant garde le contrôle total sur ce qui est autorisé.'), '+=1');
    tl.add(() => setNarrationStep(2, 'Distribution + démarrage simultanés : un seul bouton lance le devoir et démarre le minuteur.'), '+=1.2');
    tl.add(() => {
      gsap.to(assignOverlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => assignOverlay.classList.add('hidden') });
    }, '+=0.5');
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    tl.add(() => {
      ucards.forEach((card, i) => {
        card.classList.add('border-purple');
        card.style.borderColor = '#8b5cf6';
      });
    }, '+=0.3');
    tl.add(() => setNarrationStep(3, 'Suivi de progression : les badges de complétion permettent de voir en un coup d\'œil qui a terminé et qui travaille encore.'));
    tl.add(() => {
      [4, 7, 11].forEach(i => {
        const card = ucards[i];
        if (card) {
          const badge = card.querySelector('.sc-interaction-badge');
          if (badge) { badge.className = 'sc-interaction-badge badge-done'; badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:11px"></i>'; card.classList.add('badge-active'); gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.25, ease: iosSpring }); }
        }
      });
    }, '+=0.8');
    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // SCENARIO 9: Mettre en valeur le travail d'un élève
  // ============================================================
  function playSC9() {
    resetAll();
    hideNarration();
    showNarration({
      label: 'Scénario 9', title: 'Mettre en valeur un travail d\'élève',
      situation: 'Monsieur Julien veut montrer le travail de Chloé à toute la classe. Il agrandit son écran, le projette sur le vidéo projecteur et annote directement le devoir pour expliquer les points forts.',
      characters: [
        { name: 'Julien Moreau', initials: 'JM', color: '#3b82f6', role: 'Enseignant' },
        { name: 'Chloé Dupont', initials: 'CD', color: '#ec4899', role: 'Élève mise à l\'honneur' },
      ],
      steps: [
        { who: 'teacher', action: 'Sélectionner l\'écran de Chloé', detail: 'Monsieur Julien clique sur la carte de Chloé pour l\'agrandir.' },
        { who: 'teacher', action: 'Projeter l\'écran', detail: 'Il active la projection pour afficher le travail de Chloé au vidéo projecteur.' },
        { who: 'teacher', action: 'Annoter le devoir', detail: 'Il dessine des annotations sur le devoir pour mettre en évidence les bonnes réponses.' },
      ],
    });
    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;
    tl.add(() => setNarrationStep(0, 'Sélection directe : un clic sur la carte agrandit l\'écran de l\'élève en mode spotlight.'));
    setupActiveScreen();
    const ucards = screens.teacher.querySelectorAll('.sc-ucard');
    const chloeCard = ucards[4];
    tl.add(() => moveCursor(chloeCard, null), '+=0.3');
    tl.add(() => { if (chloeCard) chloeCard.classList.add('selected'); }, '+=0.15');
    tl.add(() => setNarrationStep(1, 'Projection contextuelle : le même workflow que pour l\'écran enseignant, mais appliqué au travail d\'un élève. Valoriser sans changer d\'outil.'), '+=1');
    tl.add(() => setNarrationStep(2, 'Annotation en direct : stylo, surligneur, gomme, choix de couleur. Les traits sont dessinés en direct, comme un enseignant qui annote au tableau.'), '+=1.2');
    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // SCENARIO 10: Parcours complet d'une séance
  // ============================================================
  function playSC10() {
    resetAll();
    hideNarration();
    showNarration({
      label: 'Scénario 10', title: 'Une séance complète de A à Z',
      situation: 'Monsieur Julien gère une séance entière : ouverture via QR code, distribution de ressources, supervision, sondage, récupération des travaux et clôture avec sauvegarde automatique.',
      characters: [
        { name: 'Julien Moreau', initials: 'JM', color: '#3b82f6', role: 'Enseignant' },
        { name: 'Léa Martin', initials: 'LM', color: '#ec4899', role: 'Élève participative' },
        { name: 'Hugo Lambert', initials: 'HL', color: '#22c55e', role: 'Élève en difficulté' },
      ],
      steps: [
        { who: 'teacher', action: 'Ouvrir et accueillir', detail: 'Monsieur Julien affiche le QR code, les élèves rejoignent la classe. Il active les écrans.' },
        { who: 'teacher', action: 'Distribuer et superviser', detail: 'Il envoie le cours, observe les écrans, repère que Hugo est bloqué.' },
        { who: 'teacher', action: 'Évaluer et ajuster', detail: 'Il lance un sondage rapide. Léa a compris, Hugo a besoin d\'aide.' },
        { who: 'teacher', action: 'Clôturer la séance', detail: 'Il met fin à la classe. Le récapitulatif s\'affiche, les documents sont sauvegardés sur Google Drive.' },
      ],
    });
    const tl = gsap.timeline({ delay: 0.8 });
    currentTL = tl;
    // Step 1: Open class
    tl.add(() => setNarrationStep(0, 'Flux complet : QR code → connexion progressive → affichage des écrans. L\'enseignant maîtrise chaque étape.'));
    tl.add(() => showScreen('teacher'));
    const cards = screens.teacher.querySelectorAll('.sc-ucard');
    const connCount = screens.teacher.querySelector('.p-conn-count');
    [0,1,3,4,5,6,7,8,9,10,11,12].forEach((idx, i) => {
      tl.add(() => {
        const card = cards[idx];
        if (card) { card.classList.remove('connecting'); gsap.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: springS });
          const s = card.querySelector('.sc-ucard-status'); if (s) { s.textContent = 'Connecté'; s.className = 'sc-ucard-status connected-status'; } }
        if (connCount) connCount.textContent = i + 1;
      }, i * 0.06 + 0.3);
    });
    tl.add(() => {}, '+=1');
    // Step 2: Show screens and distribute
    tl.add(() => setNarrationStep(1, 'Supervision active : les écrans révèlent l\'activité de chaque élève. L\'enseignant repère les blocages.'));
    tl.add(() => {
      cards.forEach(c => {
        c.classList.remove('no-screen');
        const sc = c.querySelector('.sc-screen-content');
        if (sc) gsap.fromTo(sc, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      });
    });
    tl.add(() => {}, '+=1.2');
    // Step 3: Poll
    tl.add(() => setNarrationStep(2, 'Évaluation formative : le sondage intégré permet de vérifier la compréhension sans outil externe.'));
    tl.add(() => {}, '+=1.5');
    // Step 4: End session
    tl.add(() => setNarrationStep(3, 'Clôture automatisée : récapitulatif des statistiques, accès aux documents, sauvegarde Google Drive automatique.'));
    const recapOverlay = document.getElementById('p-recap-overlay');
    if (recapOverlay) {
      tl.add(() => {
        recapOverlay.classList.remove('hidden');
        gsap.fromTo(recapOverlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      }, '+=0.5');
    }
    tl.add(() => {}, '+=2');
  }

  // ============================================================
  // NAVIGATION
  // ============================================================
  const protoMap = {
    t1: playT1, t2: playT2, t3: playT3, t4: playT4, t5: playT5,
    t6: playT6, t7: playT7, t8: playT8, t9: playT9,
    t10: playT10, t11: playT11, t12: playT12, t13: playT13,
    t14: playT14, t15: playT15, t16: playT16, t17: playT17, t18: playT18,
    t19: playT19, t20: playT20, t21: playT21, t22: playT22, t23: playT23, t24: playT24, t25: playT25,
    s1: playS1, s2: playS2, s3: playS3, s4: playS4, s5: playS5,
    s6: playS6, s7: playS7,
    sc1: playSC1, sc2: playSC2, sc3: playSC3, sc4: playSC4, sc5: playSC5,
    sc6: playSC6, sc7: playSC7, sc8: playSC8, sc9: playSC9, sc10: playSC10,
  };

  // --- Titles & subtitles for all prototypes ---
  const protoTitles = {
    t1:  { title: 'Ouvrir la classe (QR Code)', subtitle: 'L\'enseignant affiche un QR code en grand. Les élèves le scannent avec leur tablette et rejoignent la classe progressivement. Les cartes apparaissent une à une avec leur statut de connexion.' },
    t2:  { title: 'Activer les interactions', subtitle: 'L\'enseignant active le suivi en temps réel. Les badges d\'interaction (terminé, question, main levée) apparaissent sur les cartes des élèves pour donner une vue d\'ensemble immédiate.' },
    t3:  { title: 'Afficher les écrans', subtitle: 'L\'enseignant clique sur « Afficher les écrans » pour voir l\'activité en cours sur chaque tablette. Les miniatures d\'écran apparaissent sur les cartes, remplaçant la vue nom + statut.' },
    t4:  { title: 'Consulter les messages', subtitle: 'L\'enseignant ouvre le panneau de messages pour lire les questions et retours des élèves. Chaque message affiche le nom, le contenu et un horodatage.' },
    t5:  { title: 'Verrouiller les écrans', subtitle: 'L\'enseignant verrouille toutes les tablettes d\'un clic. Les écrans des élèves affichent un message de verrouillage. Il peut déverrouiller à tout moment.' },
    t6:  { title: 'Envoyer une ressource', subtitle: 'L\'enseignant envoie un document PDF à toute la classe. Un badge « Reçu » apparaît sur chaque carte élève pour confirmer la distribution.' },
    t7:  { title: 'Projeter son écran', subtitle: 'L\'enseignant projette le contenu de son écran sur le vidéo projecteur. Les élèves voient le contenu projeté en temps réel.' },
    t8:  { title: 'Prendre la main', subtitle: 'L\'enseignant prend le contrôle de toutes les tablettes pour afficher un contenu spécifique. Les élèves ne peuvent plus naviguer librement.' },
    t9:  { title: 'Créer des groupes', subtitle: 'L\'enseignant sélectionne des élèves pour former des groupes de travail. Les groupes sont identifiés par des couleurs dans la barre supérieure.' },
    t10: { title: 'Lancer un sondage', subtitle: 'L\'enseignant envoie une question à toute la classe. Les résultats arrivent en temps réel sous forme de barres de progression colorées.' },
    t11: { title: 'Répondre à un élève', subtitle: 'L\'enseignant ouvre le message d\'un élève et lui répond directement avec un message rapide ou personnalisé.' },
    t12: { title: 'Mettre 3 écrans en avant', subtitle: 'L\'enseignant sélectionne 3 écrans d\'élèves et les affiche en grand pour les projeter sur le vidéo projecteur.' },
    t13: { title: 'Annoter un devoir projeté', subtitle: 'L\'enseignant agrandit l\'écran d\'un élève, le projette et active le mode annotation pour dessiner directement sur le devoir.' },
    t14: { title: 'Scanner et envoyer', subtitle: 'L\'enseignant scanne un document physique avec la caméra, le recadre, le numérise en PDF puis l\'envoie sur toutes les tablettes en quelques secondes.' },
    t15: { title: 'Fin de séance', subtitle: 'L\'enseignant clique sur « Quitter ». Un récapitulatif s\'affiche avec les statistiques de la séance et l\'accès aux documents échangés.' },
    t16: { title: 'Partager un lien web', subtitle: 'L\'enseignant envoie une URL à toute la classe. Les élèves reçoivent le lien directement sur leur tablette.' },
    t17: { title: 'Lancer un minuteur', subtitle: 'L\'enseignant démarre un compteur à rebours visible par toute la classe. La barre change de couleur à mesure que le temps passe.' },
    t18: { title: 'Groupes aléatoires', subtitle: 'L\'enseignant crée automatiquement des groupes aléatoires. Les élèves sont répartis et les cartes s\'organisent par couleur de groupe.' },
    t19: { title: 'Accéder aux séances', subtitle: 'L\'enseignant consulte la liste de ses séances passées, en cours et programmées. Il peut filtrer, reprendre ou consulter chaque session.' },
    t20: { title: 'Nouvelle séance', subtitle: 'L\'enseignant crée une nouvelle séance en renseignant la matière, la classe, l\'horaire et les ressources à distribuer.' },
    t21: { title: 'Mode devoir', subtitle: 'L\'enseignant configure un exercice noté à durée limitée. Il définit les restrictions (internet, apps) et les ressources autorisées.' },
    t22: { title: 'Examen officiel — Configuration', subtitle: 'L\'enseignant lance un examen préparé par l\'administration via le MDM. Les restrictions matérielles sont verrouillées (WiFi, Bluetooth, clavier, navigation).' },
    t23: { title: 'Examen — Surveillance', subtitle: 'L\'enseignant surveille 32 élèves en temps réel pendant l\'examen. Il voit les statuts (en cours, terminé, inactif) et récupère les copies.' },
    t24: { title: 'Examen — Récapitulatif & Copies', subtitle: 'L\'enseignant accède au bilan de l\'examen : copies récupérées, sauvegarde Google Drive, envoi par email aux autorités, mode correction.' },
    t25: { title: 'Voir l\'écran d\'un élève', subtitle: 'L\'enseignant clique sur la carte d\'un élève pour afficher son écran en plein format. Il navigue entre les élèves avec un carrousel horizontal et peut verrouiller l\'écran individuellement.' },
    s1:  { title: 'Login + Scanner le QR Code', subtitle: 'L\'élève se connecte avec ses identifiants, puis scanne le QR code affiché par l\'enseignant pour rejoindre la classe.' },
    s2:  { title: 'Consulter les ressources', subtitle: 'L\'élève ouvre le panneau de ressources pour accéder aux documents partagés par l\'enseignant pendant la séance.' },
    s3:  { title: 'Envoyer « J\'ai terminé »', subtitle: 'L\'élève sélectionne un message pré-défini et l\'envoie à l\'enseignant pour signaler qu\'il a fini son travail.' },
    s4:  { title: 'Poser une question', subtitle: 'L\'élève envoie une question à l\'enseignant sans interrompre la classe, via un message asynchrone.' },
    s5:  { title: 'Partager un document', subtitle: 'L\'élève dépose un fichier dans la zone de dépôt et l\'envoie à l\'enseignant avec une barre de progression.' },
    s6:  { title: 'Recevoir une ressource', subtitle: 'L\'élève reçoit une notification toast quand l\'enseignant partage un document. Il peut l\'ouvrir dans le panneau latéral.' },
    s7:  { title: 'Écran verrouillé', subtitle: 'L\'élève voit son écran verrouillé par l\'enseignant avec un message explicite et neutre.' },
    sc1: { title: 'Démarrer et distribuer', subtitle: 'Monsieur Julien ouvre sa classe de physique. Ses élèves — Chloé, Marius et les autres — scannent le QR code, rejoignent la séance. Il affiche les écrans, distribue le cours du jour, et Chloé ouvre le PDF sur sa tablette.' },
    sc2: { title: 'Observer et intervenir', subtitle: 'En milieu de séance, Monsieur Julien observe que Emma navigue hors-sujet. Il vérifie les écrans, verrouille les tablettes pour recentrer la classe, puis consulte les messages de Ravi qui a une question.' },
    sc3: { title: 'Différencier les parcours', subtitle: 'Monsieur Julien crée un groupe « Approfondissement » avec Lucas et 4 autres élèves avancés. Il leur envoie un exercice supplémentaire pendant que Aya et les autres continuent le parcours standard.' },
    sc4: { title: 'Évaluer en direct', subtitle: 'Avant de passer au chapitre suivant, Monsieur Julien lance un sondage rapide. Chloé a bien compris, Nolan est perdu. Les résultats en temps réel permettent d\'adapter la suite du cours.' },
    sc5: { title: 'Collaborer et rendre', subtitle: 'En fin de séance, Chloé dépose son devoir, Ravi pose une dernière question. Monsieur Julien répond à Ravi, projette le travail exemplaire de Chloé à toute la classe, puis clôt la séance.' },
    sc6: { title: 'Scanner et distribuer un document papier', subtitle: 'Monsieur Julien scanne un exercice papier avec la caméra de son ordinateur, le convertit en PDF et l\'envoie sur toutes les tablettes. Léa le reçoit instantanément.' },
    sc7: { title: 'Examen officiel de bout en bout', subtitle: 'Jour d\'examen. Monsieur Julien lance le bac blanc, surveille Emma et Nolan pendant 4 heures, récupère les 32 copies et les transmet à l\'académie par email.' },
    sc8: { title: 'Contrôle surprise en classe', subtitle: 'Monsieur Julien lance un contrôle de 30 minutes avec restrictions. Chloé termine rapidement, Ravi travaille jusqu\'au bout. Les badges de complétion permettent de suivre la progression.' },
    sc9: { title: 'Mettre en valeur un travail d\'élève', subtitle: 'Monsieur Julien sélectionne le devoir de Chloé, le projette au vidéo projecteur et l\'annote en direct pour montrer les points forts à toute la classe.' },
    sc10: { title: 'Une séance complète de A à Z', subtitle: 'Monsieur Julien gère une séance entière : QR code, distribution, supervision, sondage de compréhension, puis clôture avec sauvegarde automatique. Léa participe activement, Hugo reçoit de l\'aide.' },
  };

  // --- Header elements ---
  const infoHeader = document.getElementById('proto-info-header');
  const titleEl = document.getElementById('proto-title');
  const subtitleEl = document.getElementById('proto-subtitle');

  function showProtoTitle(id) {
    const info = protoTitles[id];
    if (info && titleEl && subtitleEl) {
      if (infoBadge) infoBadge.textContent = id.toUpperCase();
      titleEl.textContent = info.title;
      subtitleEl.textContent = info.subtitle;
      if (infoHeader) gsap.fromTo(infoHeader, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3, ease: smooth });
    }
  }

  function navigateTo(id) {
    if (currentTL) { currentTL.kill(); currentTL = null; }
    gsap.set(cursor, { opacity: 0 });
    currentProto = id;
    isManualNav = false;

    // Hide sidebar for non-scenario prototypes (header already shows title/subtitle)
    if (!id.startsWith('sc')) {
      hideNarration();
    }

    // Show title in header
    showProtoTitle(id);

    tocItems.forEach(item => {
      item.classList.toggle('active', item.dataset.proto === id);
    });

    // Scroll the proto section into view
    const protoSection = document.getElementById('proto-section');
    if (protoSection) {
      protoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Scroll active TOC item into view
    const activeItem = document.querySelector('.proto-toc-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const fn = protoMap[id];
    if (fn) fn();

    // Slow down scenario timelines
    if (id.startsWith('sc') && currentTL) {
      currentTL.timeScale(SCENARIO_SPEED);
    }
  }

  // TOC click handlers
  tocItems.forEach(item => {
    // Handle scroll links (Vitrines section)
    if (item.dataset.scroll) {
      item.addEventListener('click', () => {
        const target = document.getElementById(item.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tocItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
      return;
    }
    // Handle prototype links
    item.addEventListener('click', () => navigateTo(item.dataset.proto));
  });

  // Replay (both stage button and TOC button)
  document.getElementById('proto-replay')?.addEventListener('click', () => {
    if (currentProto) navigateTo(currentProto);
  });
  document.getElementById('proto-toc-replay')?.addEventListener('click', () => {
    if (currentProto) navigateTo(currentProto);
  });

  // Auto-start first scenario
  navigateTo('t1');

})();
