/* ============================================================
   SQOOL Classe — 14 Interactive Prototype Journeys
   9 Teacher (t1–t9) + 5 Student (s1–s5)
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

  // --- Screens ---
  const screens = {
    pre: document.getElementById('scr-teacher-pre'),
    active: document.getElementById('scr-teacher-active'),
    student: document.getElementById('scr-student'),
  };

  // --- TOC ---
  const tocItems = document.querySelectorAll('.proto-toc-item');
  const btnReplay = document.getElementById('proto-replay');
  const cursor = document.getElementById('proto-cursor');

  let currentTL = null;
  let currentProto = null;

  // --- Screen switching (iPadOS page transition) ---
  function showScreen(id, instant) {
    Object.values(screens).forEach(s => {
      s.classList.remove('active');
      gsap.set(s, { opacity: 0, x: 30, scale: 0.97, pointerEvents: 'none' });
    });
    const scr = screens[id];
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
  function moveCursor(target, cb) {
    if (!target || !cursor) { cb?.(); return; }
    const sr = stage.getBoundingClientRect();
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
    const cards = screens.pre.querySelectorAll('.sc-student-card');
    cards.forEach(c => {
      c.classList.remove('connected', 'disconnected');
      gsap.set(c, { opacity: 0.35, scale: 0.95, y: 5 });
    });
    const toggle = document.getElementById('p-toggle');
    if (toggle) { toggle.classList.remove('on'); toggle.classList.add('off'); }
    screens.pre.querySelector('.p-conn-count').textContent = '0';
    screens.pre.querySelector('.p-disconn-count').textContent = '24';
    const bb = document.getElementById('p-bottom-bar');
    if (bb) { bb.classList.remove('visible'); }
    const chatBadge = document.getElementById('p-chat-count');
    if (chatBadge) chatBadge.textContent = '0';
  }

  function resetActiveScreen() {
    // Reset management cards
    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
    mgmtCards.forEach(c => {
      c.classList.remove('locked', 'selected', 'badge-active');
      gsap.set(c, { opacity: 1, y: 0, scale: 1 });
      const badge = c.querySelector('.sc-interaction-badge');
      if (badge) {
        badge.className = 'sc-interaction-badge hidden';
        badge.innerHTML = '';
      }
    });

    // Reset screen-view cards
    const screenCards = screens.active.querySelectorAll('.sc-screen-card');
    screenCards.forEach(c => {
      c.classList.remove('border-blue', 'border-green', 'border-red', 'locked');
      c.querySelectorAll('.sc-card-received').forEach(b => b.remove());
      gsap.set(c, { opacity: 1, y: 0, scale: 1 });
      const screenContent = c.querySelector('.sc-screen-content');
      const screenOff = c.querySelector('.sc-screen-off');
      if (screenContent) gsap.set(screenContent, { opacity: 1, scale: 1 });
      if (screenOff) gsap.set(screenOff, { opacity: 0 });
      const status = c.querySelector('.sc-card-status');
      if (status) {
        status.classList.remove('locked-status');
        if (status.dataset.originalText) {
          status.textContent = status.dataset.originalText;
          status.className = 'sc-card-status ' + (status.dataset.originalClass || 'active-status');
          status.style.background = '';
          status.style.color = '';
        }
      }
    });

    // Reset grids visibility
    const mgmtGrid = document.getElementById('p-grid-mgmt');
    const screenGrid = document.getElementById('p-grid-active');
    if (mgmtGrid) { mgmtGrid.classList.remove('hidden'); gsap.set(mgmtGrid, { opacity: 1 }); }
    if (screenGrid) { screenGrid.classList.add('hidden'); gsap.set(screenGrid, { opacity: 1 }); }

    // Reset messages panel
    document.getElementById('p-messages-panel')?.classList.add('hidden');

    // Reset overlays
    document.getElementById('p-send-overlay')?.classList.add('hidden');
    document.getElementById('p-project-overlay')?.classList.add('hidden');
    document.getElementById('p-push-overlay')?.classList.add('hidden');
    document.getElementById('p-group-overlay')?.classList.add('hidden');
    document.getElementById('p-send-check')?.classList.add('hidden');

    // Reset action bar buttons
    screens.active.querySelectorAll('.sc-action-btn').forEach(b => b.classList.remove('active-btn'));

    // Reset group bar
    const groupBar = screens.active.querySelector('.sc-group-bar');
    if (groupBar) {
      groupBar.querySelectorAll('.sc-group-pill:not(#p-group-classe)').forEach(p => p.remove());
    }

    // Reset group chip selections
    document.querySelectorAll('.sc-group-chip').forEach(c => c.classList.remove('selected'));

    // Reset lock banner
    screens.active.querySelectorAll('.sc-lock-banner-floating').forEach(b => b.remove());

    // Reset timer
    const timerFill = document.getElementById('p-timer-fill');
    if (timerFill) timerFill.style.width = '30%';
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
    resetPreScreen();
    resetActiveScreen();
    resetStudentScreen();
  }

  // Helper: set up active screen with all students online
  function setupActiveScreen() {
    showScreen('active', true);
    resetActiveScreen();
  }

  // ============================================================
  // TEACHER SCENARIOS
  // ============================================================

  // --- T1: Ouvrir la classe ---
  function playT1() {
    resetAll();
    showScreen('pre');
    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    const cards = screens.pre.querySelectorAll('.sc-student-card');
    const connCount = screens.pre.querySelector('.p-conn-count');
    const disconnCount = screens.pre.querySelector('.p-disconn-count');

    const connectOrder = [0,4,1,7,3,5,9,2,6,8,10,11,13,12,14,15,16,17,18,19,20,21,22];
    let connected = 0;

    connectOrder.forEach((idx, i) => {
      tl.add(() => {
        const card = cards[idx];
        gsap.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: smooth });
        card.classList.add('connected');
        connected++;
        connCount.textContent = connected;
        disconnCount.textContent = 24 - connected;
      }, i * 0.1 + 0.3);
    });

    tl.add(() => {
      const marius = cards[23] || cards[2];
      gsap.to(marius, { opacity: 0.35, scale: 0.95, duration: 0.3 });
      marius.classList.add('disconnected');
      marius.classList.remove('connected');
      const bb = document.getElementById('p-bottom-bar');
      if (bb) {
        bb.classList.add('visible');
        document.getElementById('p-bottom-text').textContent = 'Marius BERTHELOT - n\'est pas connecté';
      }
      disconnCount.textContent = '1';
      connCount.textContent = '23';
    }, '+=0.3');

    tl.add(() => {}, '+=1');
  }

  // --- T2: Activer les interactions (show badges on management cards) ---
  function playT2() {
    resetAll();
    showScreen('pre');

    // Pre-set: all connected
    const preCards = screens.pre.querySelectorAll('.sc-student-card');
    preCards.forEach(c => { gsap.set(c, { opacity: 1, scale: 1, y: 0 }); c.classList.add('connected'); });
    screens.pre.querySelector('.p-conn-count').textContent = '23';
    screens.pre.querySelector('.p-disconn-count').textContent = '1';

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // 1) Cursor clicks toggle
    const toggle = document.getElementById('p-toggle');
    tl.add(() => moveCursor(toggle, null));
    tl.add(() => {
      toggle.classList.remove('off');
      toggle.classList.add('on');
    }, '+=0.2');

    // 2) Transition to active screen (management view)
    tl.add(() => {}, '+=0.5');
    tl.add(() => showScreen('active'));
    tl.add(() => {}, '+=0.4');

    // 3) Management cards stagger in
    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
    mgmtCards.forEach(c => gsap.set(c, { opacity: 0, y: 10, scale: 0.95 }));
    tl.add(() => {
      mgmtCards.forEach((c, i) => {
        gsap.to(c, { opacity: 1, y: 0, scale: 1, duration: 0.3, delay: i * 0.03, ease: springS });
      });
    });
    tl.add(() => {}, '+=0.8');

    // 4) Interaction badges appear on some students
    const badgeData = [
      { idx: 3, type: 'badge-done', icon: 'ph-fill ph-check-circle', text: '' },
      { idx: 5, type: 'badge-question', icon: 'ph-fill ph-question', text: '' },
      { idx: 7, type: 'badge-done', icon: 'ph-fill ph-check-circle', text: '' },
      { idx: 9, type: 'badge-help', icon: 'ph-fill ph-hand-waving', text: '' },
      { idx: 0, type: 'badge-understood', icon: 'ph-fill ph-thumbs-up', text: '' },
      { idx: 11, type: 'badge-done', icon: 'ph-fill ph-check-circle', text: '' },
      { idx: 4, type: 'badge-question', icon: 'ph-fill ph-question', text: '' },
    ];

    badgeData.forEach((bd, i) => {
      tl.add(() => {
        const card = mgmtCards[bd.idx];
        if (!card) return;
        const badge = card.querySelector('.sc-interaction-badge');
        if (!badge) return;
        badge.className = 'sc-interaction-badge ' + bd.type;
        badge.innerHTML = '<i class="' + bd.icon + '" style="font-size:11px"></i>';
        card.classList.add('badge-active');
        gsap.fromTo(badge,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.25, ease: iosSpring }
        );
      }, i * 0.3 + 0.2);
    });

    tl.add(() => {}, '+=1.5');
  }

  // --- T3: Afficher l'activité sur les écrans (toggle to screen view) ---
  function playT3() {
    resetAll();
    setupActiveScreen();

    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
    const mgmtGrid = document.getElementById('p-grid-mgmt');
    const screenGrid = document.getElementById('p-grid-active');
    const screenCards = screens.active.querySelectorAll('.sc-screen-card');
    const btnScreenView = document.getElementById('p-btn-screen-view');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Brief pause showing management view
    tl.add(() => {}, '+=0.5');

    // Cursor clicks screen view button in topbar
    tl.add(() => moveCursor(btnScreenView, null));

    tl.add(() => {
      btnScreenView.classList.add('active-btn');
      btnScreenView.style.background = '#007aff';
      btnScreenView.style.color = '#fff';
    }, '+=0.15');

    // Management grid fades out
    tl.add(() => {
      gsap.to(mgmtGrid, { opacity: 0, duration: 0.25, ease: smooth, onComplete: () => mgmtGrid.classList.add('hidden') });
    }, '+=0.2');

    // Screen grid appears
    tl.add(() => {
      screenGrid.classList.remove('hidden');
      screenCards.forEach(c => {
        const content = c.querySelector('.sc-screen-content');
        if (content) gsap.set(content, { opacity: 0, scale: 0.9 });
        gsap.set(c, { opacity: 0, y: 12, scale: 0.95 });
      });
    }, '+=0.15');

    // Screen cards stagger in
    tl.add(() => {
      screenCards.forEach((c, i) => {
        gsap.to(c, { opacity: 1, y: 0, scale: 1, duration: 0.35, delay: i * 0.04, ease: springS });
      });
    });
    tl.add(() => {}, '+=0.6');

    // Screen content reveals
    tl.add(() => {
      screenCards.forEach((c, i) => {
        const content = c.querySelector('.sc-screen-content');
        if (content) {
          gsap.to(content, { opacity: 1, scale: 1, duration: 0.35, delay: i * 0.04, ease: smooth });
        }
      });
    }, '+=0.2');

    // Add some interaction borders
    tl.add(() => {}, '+=0.6');
    [{ idx: 3, cls: 'border-green' }, { idx: 7, cls: 'border-green' },
     { idx: 4, cls: 'border-red' }, { idx: 9, cls: 'border-red' },
     { idx: 0, cls: 'border-blue' }, { idx: 8, cls: 'border-blue' }].forEach((item, i) => {
      tl.add(() => { screenCards[item.idx]?.classList.add(item.cls); }, i > 0 ? '-=0.02' : '+=0.1');
      tl.add(() => {}, '+=0.12');
    });

    tl.add(() => {}, '+=1');
  }

  // --- T4: Consulter les messages ---
  function playT4() {
    resetAll();
    setupActiveScreen();

    const mgmtGrid = document.getElementById('p-grid-mgmt');
    const panel = document.getElementById('p-messages-panel');

    // Add some badges to management cards
    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
    [{ idx: 5, type: 'badge-question' }, { idx: 3, type: 'badge-done' }, { idx: 4, type: 'badge-question' }].forEach(bd => {
      const card = mgmtCards[bd.idx];
      if (!card) return;
      const badge = card.querySelector('.sc-interaction-badge');
      if (badge) {
        badge.className = 'sc-interaction-badge ' + bd.type;
        badge.innerHTML = '<i class="ph-fill ph-' + (bd.type === 'badge-question' ? 'question' : 'check-circle') + '" style="font-size:11px"></i>';
        card.classList.add('badge-active');
      }
    });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    tl.add(() => {}, '+=0.5');

    // Cursor clicks a badge card to open messages
    const targetCard = mgmtCards[5];
    tl.add(() => moveCursor(targetCard, null));

    // Show messages panel, hide grid
    tl.add(() => {
      panel.classList.remove('hidden');
      gsap.fromTo(panel, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: springS });
      gsap.to(mgmtGrid, { opacity: 0.3, duration: 0.2 });
    }, '+=0.2');

    // Messages appear one by one
    const msgs = panel.querySelectorAll('.sc-msg-row');
    msgs.forEach((m, i) => {
      gsap.set(m, { opacity: 0, x: -20 });
      tl.to(m, { opacity: 1, x: 0, duration: 0.35, ease: springS }, `-=${i > 0 ? 0.15 : 0}`);
    });

    tl.add(() => {}, '+=1.5');
  }

  // --- T5: Verrouiller les écrans (no full overlay — teacher keeps control) ---
  function playT5() {
    resetAll();
    setupActiveScreen();

    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
    const lockBtn = document.getElementById('p-btn-lock');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    tl.add(() => {}, '+=0.5');

    // Cursor clicks lock button in action bar
    tl.add(() => moveCursor(lockBtn, null));

    tl.add(() => {
      lockBtn.classList.add('active-btn');
    }, '+=0.12');

    // Management cards go into locked state one by one (wave effect)
    tl.add(() => {
      mgmtCards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('locked');
          const avatar = card.querySelector('.sc-avatar-status');
          if (avatar) {
            avatar.classList.remove('online');
            avatar.classList.add('away');
          }
          gsap.fromTo(card, { scale: 1 }, { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1, ease: smooth });
        }, i * 50);
      });
    }, '+=0.2');

    // Show floating lock banner (not a full overlay)
    tl.add(() => {
      const banner = document.createElement('div');
      banner.className = 'sc-lock-banner-floating';
      banner.innerHTML = '<i class="ph-fill ph-lock-simple" style="font-size:18px"></i> Écrans verrouillés';
      screens.active.appendChild(banner);
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
      const banner = screens.active.querySelector('.sc-lock-banner-floating');
      if (banner) {
        gsap.to(banner, { opacity: 0, scale: 0.9, duration: 0.2, onComplete: () => banner.remove() });
      }

      // Unlock cards
      mgmtCards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.remove('locked');
          const avatar = card.querySelector('.sc-avatar-status');
          if (avatar) {
            avatar.classList.remove('away');
            avatar.classList.add('online');
          }
        }, i * 40);
      });
    }, '+=0.2');

    tl.add(() => {}, '+=1.5');
  }

  // --- T6: Envoyer une ressource (with card feedback) ---
  function playT6() {
    resetAll();
    setupActiveScreen();

    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
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

    // Feedback on management cards — staggered received badges
    tl.add(() => {
      mgmtCards.forEach((card, i) => {
        if (card.classList.contains('locked')) return;
        const badge = document.createElement('div');
        badge.className = 'sc-card-received';
        badge.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size:14px;color:#34c759"></i>';
        card.appendChild(badge);
        gsap.fromTo(badge,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.25, delay: i * 0.03, ease: smooth }
        );
        gsap.fromTo(card,
          { boxShadow: '0 0 0 0 rgba(52,199,89,0)' },
          { boxShadow: '0 0 0 2px rgba(52,199,89,.3)', duration: 0.2, delay: i * 0.03, yoyo: true, repeat: 1 }
        );
        setTimeout(() => {
          gsap.to(badge, { opacity: 0, duration: 0.3, onComplete: () => badge.remove() });
        }, 2000 + i * 30);
      });
    }, '+=0.3');

    tl.add(() => {}, '+=2.5');
  }

  // --- T7: Projeter son écran ---
  function playT7() {
    resetAll();
    setupActiveScreen();

    const shareScreenBtn = document.getElementById('p-btn-share-screen');
    const overlay = document.getElementById('p-project-overlay');

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks "Partager l'écran"
    tl.add(() => moveCursor(shareScreenBtn, null));
    tl.add(() => { shareScreenBtn.classList.add('active-btn'); }, '+=0.15');

    // Show projection overlay
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: smooth });
      gsap.fromTo(overlay.querySelector('.sc-project-modal'),
        { scale: 0.95, y: 20, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: iosSpring }
      );
    }, '+=0.2');

    // Animate the preview screen
    tl.add(() => {
      const preview = overlay.querySelector('.sc-project-preview');
      if (preview) {
        gsap.fromTo(preview,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.3, delay: 0.1, ease: smooth }
        );
      }
    }, '+=0.3');

    // Status updates
    tl.add(() => {
      const status = overlay.querySelector('.sc-project-status');
      if (status) {
        gsap.fromTo(status, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: smooth });
      }
    }, '+=0.5');

    // Hold
    tl.add(() => {}, '+=2');

    // Stop projection
    const stopBtn = document.getElementById('p-btn-stop-project');
    tl.add(() => moveCursor(stopBtn, null));
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.3, ease: smooth, onComplete: () => overlay.classList.add('hidden') });
      shareScreenBtn.classList.remove('active-btn');
    }, '+=0.15');

    tl.add(() => {}, '+=1');
  }

  // --- T8: Prendre la main (push resource/app fullscreen to students) ---
  function playT8() {
    resetAll();
    setupActiveScreen();

    const overlay = document.getElementById('p-push-overlay');
    const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');

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
      mgmtCards.forEach((card, i) => {
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
      mgmtCards.forEach((card, i) => {
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
      const groupBar = screens.active.querySelector('.sc-group-bar');
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
      const mgmtCards = screens.active.querySelectorAll('.sc-mgmt-card');
      selectOrder.forEach((chipIdx) => {
        const chipStudent = chips[chipIdx]?.dataset.student;
        mgmtCards.forEach(card => {
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

    const dot = document.getElementById('p-student-dot');
    const name = document.getElementById('p-student-name');
    gsap.set(dot, { background: '#94a3b8' });
    name.textContent = 'Chloé DUPONT – Connexion...';

    tl.to('#p-session-fill', { width: '5%', duration: 0.8, ease: smooth }, '+=0.3');

    tl.add(() => {
      gsap.to(dot, { background: '#22c55e', duration: 0.3 });
      name.textContent = 'Chloé DUPONT – Connectée';
    }, '+=0.5');

    const panels = screens.student.querySelectorAll('.sc-panel:not(.sc-confirm-panel)');
    panels.forEach(p => gsap.set(p, { opacity: 0, y: 8 }));
    tl.add(() => {
      panels.forEach((p, i) => {
        gsap.to(p, { opacity: 1, y: 0, duration: 0.3, delay: i * 0.08, ease: smooth });
      });
    }, '+=0.25');

    tl.to('#p-session-fill', { width: '35%', duration: 1.5, ease: smooth }, '+=0.5');

    const resources = screens.student.querySelectorAll('.sc-resource');
    resources.forEach(r => gsap.set(r, { opacity: 0, x: -10 }));
    tl.add(() => {
      resources.forEach((r, i) => {
        gsap.to(r, { opacity: 1, x: 0, duration: 0.3, delay: i * 0.1, ease: springS });
      });
    }, '-=0.8');

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

  // ============================================================
  // NAVIGATION
  // ============================================================
  const protoMap = {
    t1: playT1, t2: playT2, t3: playT3, t4: playT4, t5: playT5,
    t6: playT6, t7: playT7, t8: playT8, t9: playT9,
    s1: playS1, s2: playS2, s3: playS3, s4: playS4, s5: playS5,
  };

  function navigateTo(id) {
    if (currentTL) { currentTL.kill(); currentTL = null; }
    gsap.set(cursor, { opacity: 0 });
    currentProto = id;

    tocItems.forEach(item => {
      item.classList.toggle('active', item.dataset.proto === id);
    });

    const fn = protoMap[id];
    if (fn) fn();
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

  // Replay
  btnReplay?.addEventListener('click', () => {
    if (currentProto) navigateTo(currentProto);
  });

  // Auto-start first scenario
  navigateTo('t1');

})();
