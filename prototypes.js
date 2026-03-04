/* ============================================================
   SQOOL Classe — 10 Interactive Prototype Journeys
   5 Teacher + 5 Student, full-screen, GSAP spring animations
   ============================================================ */
(function () {
  'use strict';

  const stage = document.getElementById('proto-stage');
  if (!stage) return;

  // --- GSAP easing presets ---
  const spring = 'elastic.out(1, 0.55)';
  const springS = 'back.out(1.7)';
  const smooth = 'power3.out';

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

  // --- Screen switching ---
  function showScreen(id, instant) {
    Object.values(screens).forEach(s => {
      s.classList.remove('active');
      gsap.set(s, { opacity: 0, x: 40, pointerEvents: 'none' });
    });
    const scr = screens[id];
    if (instant) {
      gsap.set(scr, { opacity: 1, x: 0, pointerEvents: 'auto' });
    } else {
      gsap.fromTo(scr,
        { opacity: 0, x: 40, scale: 0.98 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: springS, onStart: () => { scr.style.pointerEvents = 'auto'; } }
      );
    }
    scr.classList.add('active');
  }

  // --- Cursor animation ---
  function moveCursor(target, cb) {
    if (!target || !cursor) { cb?.(); return; }
    const sr = stage.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const tx = tr.left - sr.left + tr.width * 0.55;
    const ty = tr.top - sr.top + tr.height * 0.5;

    const tl = gsap.timeline({ onComplete: cb });
    tl.set(cursor, { left: tx + 50, top: ty + 50, opacity: 0 });
    tl.to(cursor, { left: tx, top: ty, opacity: 1, duration: 0.5, ease: 'power2.out' });
    tl.to(cursor, { scale: 0.8, duration: 0.06 });
    tl.to(cursor, { scale: 1, duration: 0.15, ease: springS });
    tl.to(target, { scale: 0.97, duration: 0.06 }, '-=0.21');
    tl.to(target, { scale: 1, duration: 0.3, ease: spring }, '-=0.15');
    tl.to(cursor, { opacity: 0, duration: 0.2 }, '+=0.1');
    return tl;
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
    const cards = screens.active.querySelectorAll('.sc-student-card');
    cards.forEach(c => {
      c.classList.remove('border-blue', 'border-green', 'border-red', 'locked');
      c.querySelectorAll('.sc-st-badge').forEach(b => b.remove());
      gsap.set(c, { opacity: 1, y: 0, scale: 1 });
    });
    // Reset popups
    screens.active.querySelectorAll('.sc-popup').forEach(p => gsap.set(p, { opacity: 0, y: 10, scale: 0.9 }));
    // Reset sidebar
    gsap.set('#p-sidebar', { opacity: 1, x: 0 });
    screens.active.querySelectorAll('.sc-side-btn').forEach(b => b.classList.remove('active-btn'));
    // Reset overlays
    document.getElementById('p-messages-panel')?.classList.add('hidden');
    document.getElementById('p-send-overlay')?.classList.add('hidden');
    document.getElementById('p-lock-overlay')?.classList.add('hidden');
    document.getElementById('p-send-check')?.classList.add('hidden');
    // Reset tabs
    screens.active.querySelectorAll('.sc-tool-tab').forEach((t, i) => {
      t.classList.remove('active-tab');
      if (i === 0) t.classList.add('active-tab');
    });
    const msgBadge = document.getElementById('p-msg-badge');
    if (msgBadge) msgBadge.textContent = '0';
  }

  function resetStudentScreen() {
    // Reset chips
    screens.student.querySelectorAll('.sc-msg-chip').forEach(c => c.classList.remove('selected'));
    // Reset confirm
    document.getElementById('p-confirm')?.classList.add('hidden');
    document.getElementById('p-panel-messages').style.display = '';
    gsap.set('#p-panel-messages', { opacity: 1, scale: 1 });
    // Reset upload
    document.getElementById('p-uploaded-file')?.classList.add('hidden');
    const uz = document.getElementById('p-upload-zone');
    if (uz) { uz.classList.remove('drag-over'); uz.style.display = ''; }
    // Reset lock & toast
    document.getElementById('p-student-lock')?.classList.add('hidden');
    document.getElementById('p-toast')?.classList.add('hidden');
    // Reset resources highlight
    screens.student.querySelectorAll('.sc-resource').forEach(r => r.classList.remove('highlight'));
    // Reset progress
    const fill = document.getElementById('p-session-fill');
    if (fill) fill.style.width = '0%';
  }

  function resetAll() {
    if (currentTL) { currentTL.kill(); currentTL = null; }
    gsap.set(cursor, { opacity: 0 });
    resetPreScreen();
    resetActiveScreen();
    resetStudentScreen();
  }

  // ============================================================
  // SCENARIO BUILDERS
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

    // Students connect one by one
    const connectOrder = [0,4,1,7,3,5,9,2,6,8,10,11,13,12,14,15,16,17,18,19,20,21,22];
    let connected = 0;

    connectOrder.forEach((idx, i) => {
      tl.add(() => {
        const card = cards[idx];
        gsap.to(card, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: springS });
        card.classList.add('connected');
        connected++;
        connCount.textContent = connected;
        disconnCount.textContent = 24 - connected;
      }, i * 0.12 + 0.3);
    });

    // Marius stays disconnected
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

  // --- T2: Activer les interactions ---
  function playT2() {
    resetAll();
    showScreen('pre');
    // Pre-set: all connected
    const cards = screens.pre.querySelectorAll('.sc-student-card');
    cards.forEach(c => { gsap.set(c, { opacity: 1, scale: 1, y: 0 }); c.classList.add('connected'); });
    screens.pre.querySelector('.p-conn-count').textContent = '23';
    screens.pre.querySelector('.p-disconn-count').textContent = '1';

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks toggle
    const toggle = document.getElementById('p-toggle');
    tl.add(() => moveCursor(toggle, null));
    tl.add(() => {
      toggle.classList.remove('off');
      toggle.classList.add('on');
    }, '+=0.2');

    // Transition to active screen
    tl.add(() => {}, '+=0.5');
    tl.add(() => showScreen('active'));
    tl.add(() => {}, '+=0.3');

    // Sidebar slides in
    gsap.set('#p-sidebar', { opacity: 0, x: 30 });
    tl.to('#p-sidebar', { opacity: 1, x: 0, duration: 0.5, ease: springS });

    // Cards get colored borders progressively
    const activeCards = screens.active.querySelectorAll('.sc-student-card');
    const interactions = [
      { idx: 0, cls: 'border-blue', emoji: '📝' },
      { idx: 3, cls: 'border-green', emoji: '✓' },
      { idx: 4, cls: 'border-red', emoji: '!' },
      { idx: 7, cls: 'border-green', emoji: '✓' },
      { idx: 8, cls: 'border-blue', emoji: '📝' },
      { idx: 9, cls: 'border-red', emoji: '!' },
    ];
    interactions.forEach((item, i) => {
      tl.add(() => {
        const card = activeCards[item.idx];
        card.classList.add(item.cls);
        const badge = document.createElement('div');
        badge.className = 'sc-st-badge ' + (item.cls === 'border-blue' ? 'blue-badge' : item.cls === 'border-green' ? 'green-badge' : 'red-badge');
        badge.textContent = item.emoji;
        card.appendChild(badge);
        gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.3, ease: spring });
        gsap.fromTo(card, { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: springS });
      }, '-=0.1');
      tl.add(() => {}, '+=0.25');
    });

    tl.add(() => {}, '+=1');
  }

  // --- T3: Consulter les messages ---
  function playT3() {
    resetAll();
    showScreen('active', true);
    resetActiveScreen();

    // Pre-set some interaction borders
    const activeCards = screens.active.querySelectorAll('.sc-student-card');
    [0,3,8].forEach(i => activeCards[i]?.classList.add('border-blue'));
    [4,9].forEach(i => activeCards[i]?.classList.add('border-red'));

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Badge appears on messages tab
    const msgBadge = document.getElementById('p-msg-badge');
    tl.add(() => {
      msgBadge.textContent = '3';
      gsap.fromTo(msgBadge, { scale: 0 }, { scale: 1, duration: 0.3, ease: spring });
    });

    // Cursor clicks "Messages reçus" tab
    const msgTab = screens.active.querySelector('[data-tab="messages"]');
    tl.add(() => moveCursor(msgTab, null), '+=0.4');

    // Activate tab
    tl.add(() => {
      screens.active.querySelectorAll('.sc-tool-tab').forEach(t => t.classList.remove('active-tab'));
      msgTab.classList.add('active-tab');
    }, '+=0.2');

    // Show messages panel, hide grid
    const grid = document.getElementById('p-grid-active');
    const panel = document.getElementById('p-messages-panel');
    tl.add(() => {
      panel.classList.remove('hidden');
      gsap.fromTo(panel, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: springS });
      gsap.to(grid, { opacity: 0, duration: 0.2 });
    }, '+=0.2');

    // Messages appear one by one
    const msgs = panel.querySelectorAll('.sc-msg-row');
    msgs.forEach((m, i) => {
      gsap.set(m, { opacity: 0, x: -20 });
      tl.to(m, { opacity: 1, x: 0, duration: 0.35, ease: springS }, `-=${i > 0 ? 0.15 : 0}`);
    });

    tl.add(() => {}, '+=1.5');
  }

  // --- T4: Verrouiller les écrans ---
  function playT4() {
    resetAll();
    showScreen('active', true);
    resetActiveScreen();

    const activeCards = screens.active.querySelectorAll('.sc-student-card');
    [0,3,8].forEach(i => activeCards[i]?.classList.add('border-blue'));

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks lock button
    const lockBtn = document.getElementById('p-btn-lock');
    tl.add(() => moveCursor(lockBtn, null));

    // Highlight button
    tl.add(() => {
      lockBtn.classList.add('active-btn');
      gsap.fromTo(lockBtn, { scale: 1 }, { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1, ease: springS });
    }, '+=0.2');

    // Cards get locked state progressively
    tl.add(() => {
      activeCards.forEach((c, i) => {
        gsap.to(c, { opacity: 0.5, duration: 0.3, delay: i * 0.03, ease: smooth });
        setTimeout(() => c.classList.add('locked'), i * 30 + 200);
      });
    }, '+=0.3');

    // Lock overlay appears
    const lockOverlay = document.getElementById('p-lock-overlay');
    tl.add(() => {
      lockOverlay.classList.remove('hidden');
      gsap.fromTo(lockOverlay, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: smooth });
      gsap.fromTo(lockOverlay.querySelector('.sc-lock-banner'), { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.5, ease: spring });
    }, '+=0.5');

    // After a moment, unlock
    tl.add(() => {}, '+=2');
    tl.add(() => {
      gsap.to(lockOverlay, { opacity: 0, duration: 0.3, onComplete: () => lockOverlay.classList.add('hidden') });
      lockBtn.classList.remove('active-btn');
      activeCards.forEach(c => { c.classList.remove('locked'); gsap.to(c, { opacity: 1, duration: 0.3 }); });
    });

    tl.add(() => {}, '+=1');
  }

  // --- T5: Envoyer une ressource ---
  function playT5() {
    resetAll();
    showScreen('active', true);
    resetActiveScreen();

    const activeCards = screens.active.querySelectorAll('.sc-student-card');
    [3,7].forEach(i => activeCards[i]?.classList.add('border-green'));

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks "Envoyer" sidebar button
    const sendBtn = document.getElementById('p-btn-send-res');
    tl.add(() => moveCursor(sendBtn, null));

    tl.add(() => {
      sendBtn.classList.add('active-btn');
    }, '+=0.2');

    // Show send overlay
    const overlay = document.getElementById('p-send-overlay');
    tl.add(() => {
      overlay.classList.remove('hidden');
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(overlay.querySelector('.sc-send-modal'), { scale: 0.9, y: 30 }, { scale: 1, y: 0, duration: 0.5, ease: spring });
    }, '+=0.3');

    // Cursor clicks "Envoyer à la classe"
    const confirmBtn = document.getElementById('p-send-confirm');
    tl.add(() => moveCursor(confirmBtn, null), '+=0.8');

    // Confirm action
    tl.add(() => {
      gsap.to(confirmBtn, { scale: 0.95, duration: 0.06, yoyo: true, repeat: 1 });
    }, '+=0.1');

    // Checkmark appears
    tl.add(() => {
      const check = document.getElementById('p-send-check');
      check.classList.remove('hidden');
      gsap.fromTo(check, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.4, ease: spring });
    }, '+=0.3');

    // Close modal
    tl.add(() => {
      gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => overlay.classList.add('hidden') });
      sendBtn.classList.remove('active-btn');
    }, '+=1');

    tl.add(() => {}, '+=1');
  }

  // --- S1: Rejoindre la séance ---
  function playS1() {
    resetAll();
    showScreen('student');
    resetStudentScreen();

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Student connecting animation
    const dot = document.getElementById('p-student-dot');
    const name = document.getElementById('p-student-name');
    gsap.set(dot, { background: '#94a3b8' });
    name.textContent = 'Chloé DUPONT – Connexion...';

    // Progress bar fills
    tl.to('#p-session-fill', { width: '5%', duration: 0.8, ease: smooth }, '+=0.3');

    // Connected!
    tl.add(() => {
      gsap.to(dot, { background: '#22c55e', duration: 0.3 });
      name.textContent = 'Chloé DUPONT – Connectée';
    }, '+=0.5');

    // Panels appear with stagger
    const panels = screens.student.querySelectorAll('.sc-panel:not(.sc-confirm-panel)');
    panels.forEach(p => gsap.set(p, { opacity: 0, y: 15, scale: 0.97 }));
    tl.add(() => {
      panels.forEach((p, i) => {
        gsap.to(p, { opacity: 1, y: 0, scale: 1, duration: 0.4, delay: i * 0.12, ease: springS });
      });
    }, '+=0.3');

    // Progress to 35%
    tl.to('#p-session-fill', { width: '35%', duration: 1.5, ease: smooth }, '+=0.5');

    // Resources load in
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

    // Cursor clicks on PDF resource
    const pdfRes = screens.student.querySelector('[data-res="pdf"]');
    tl.add(() => moveCursor(pdfRes, null));
    tl.add(() => {
      pdfRes.classList.add('highlight');
      gsap.fromTo(pdfRes, { scale: 1 }, { scale: 1.03, duration: 0.2, yoyo: true, repeat: 1, ease: springS });
    }, '+=0.1');

    // Browse — simulate reading
    tl.to('#p-session-fill', { width: '45%', duration: 1.5, ease: smooth }, '+=0.5');
    tl.add(() => pdfRes.classList.remove('highlight'), '+=0.3');

    // Cursor clicks link
    const wikiRes = screens.student.querySelector('[data-res="wiki"]');
    tl.add(() => moveCursor(wikiRes, null), '+=0.3');
    tl.add(() => {
      wikiRes.classList.add('highlight');
      gsap.fromTo(wikiRes, { scale: 1 }, { scale: 1.03, duration: 0.2, yoyo: true, repeat: 1, ease: springS });
    }, '+=0.1');

    tl.to('#p-session-fill', { width: '55%', duration: 1, ease: smooth }, '+=0.5');
    tl.add(() => wikiRes.classList.remove('highlight'));

    // Click Pearltrees
    const pearlRes = screens.student.querySelector('[data-res="pearl"]');
    tl.add(() => moveCursor(pearlRes, null), '+=0.3');
    tl.add(() => {
      pearlRes.classList.add('highlight');
    }, '+=0.1');

    tl.to('#p-session-fill', { width: '65%', duration: 1, ease: smooth }, '+=0.5');
    tl.add(() => pearlRes.classList.remove('highlight'));

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

    // Cursor clicks "J'ai terminé"
    const chip = screens.student.querySelector('[data-msg="termine"]');
    tl.add(() => moveCursor(chip, null));
    tl.add(() => { chip.classList.add('selected'); }, '+=0.1');
    tl.add(() => {}, '+=0.3');

    // Cursor clicks "Envoyer"
    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null));

    // Button press
    tl.to(sendBtn, { scale: 0.93, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.25, ease: spring });

    // Hide message panel, show confirmation
    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => {
      gsap.to(msgPanel, { opacity: 0, scale: 0.95, duration: 0.25, onComplete: () => { msgPanel.style.display = 'none'; } });
    }, '+=0.2');
    tl.add(() => {
      confirm.classList.remove('hidden');
      gsap.fromTo(confirm, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: spring });
    }, '+=0.1');

    // Progress completes
    tl.to('#p-session-fill', { width: '100%', duration: 0.8, ease: smooth }, '-=0.2');

    tl.add(() => {}, '+=1.5');
  }

  // --- S4: Poser une question ---
  function playS4() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '40%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor clicks "J'ai une question"
    const chip = screens.student.querySelector('[data-msg="question"]');
    tl.add(() => moveCursor(chip, null));
    tl.add(() => { chip.classList.add('selected'); }, '+=0.1');
    tl.add(() => {}, '+=0.3');

    // Cursor clicks "Envoyer"
    const sendBtn = document.getElementById('p-btn-send');
    tl.add(() => moveCursor(sendBtn, null));

    tl.to(sendBtn, { scale: 0.93, duration: 0.06 }, '+=0.05');
    tl.to(sendBtn, { scale: 1, duration: 0.25, ease: spring });

    // Confirmation
    const msgPanel = document.getElementById('p-panel-messages');
    const confirm = document.getElementById('p-confirm');
    tl.add(() => {
      gsap.to(msgPanel, { opacity: 0, scale: 0.95, duration: 0.25, onComplete: () => { msgPanel.style.display = 'none'; } });
    }, '+=0.2');
    tl.add(() => {
      confirm.classList.remove('hidden');
      gsap.fromTo(confirm, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: spring });
    }, '+=0.1');

    tl.add(() => {}, '+=1.5');
  }

  // --- S5: Partager un document ---
  function playS5() {
    resetAll();
    showScreen('student', true);
    resetStudentScreen();
    gsap.set('#p-session-fill', { width: '60%' });

    const tl = gsap.timeline({ delay: 0.5 });
    currentTL = tl;

    // Cursor moves to upload zone
    const uploadZone = document.getElementById('p-upload-zone');
    tl.add(() => moveCursor(uploadZone, null));

    // Drag-over effect
    tl.add(() => {
      uploadZone.classList.add('drag-over');
      gsap.fromTo(uploadZone, { scale: 1 }, { scale: 1.02, duration: 0.3, ease: springS });
    }, '+=0.2');

    // "Drop" — file appears
    tl.add(() => {
      uploadZone.classList.remove('drag-over');
      uploadZone.style.display = 'none';
      const uploaded = document.getElementById('p-uploaded-file');
      uploaded.classList.remove('hidden');
      gsap.fromTo(uploaded, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: spring });
    }, '+=0.5');

    // Progress advances
    tl.to('#p-session-fill', { width: '70%', duration: 0.8, ease: smooth }, '+=0.3');

    tl.add(() => {}, '+=1.5');
  }

  // ============================================================
  // NAVIGATION
  // ============================================================
  const protoMap = {
    t1: playT1, t2: playT2, t3: playT3, t4: playT4, t5: playT5,
    s1: playS1, s2: playS2, s3: playS3, s4: playS4, s5: playS5,
  };

  function navigateTo(id) {
    if (currentTL) { currentTL.kill(); currentTL = null; }
    gsap.set(cursor, { opacity: 0 });
    currentProto = id;

    // Update TOC
    tocItems.forEach(item => {
      item.classList.toggle('active', item.dataset.proto === id);
    });

    // Play scenario
    const fn = protoMap[id];
    if (fn) fn();
  }

  // TOC click handlers
  tocItems.forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.proto));
  });

  // Replay
  btnReplay?.addEventListener('click', () => {
    if (currentProto) navigateTo(currentProto);
  });

  // Auto-start first scenario
  navigateTo('t1');

})();
