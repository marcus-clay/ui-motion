// ============================================================
// GSAP Animations — Komète Dashboard iPad Mockup
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // Responsive Scaling — fit iPad frame to any viewport
  // ============================================================
  const IPAD_W = 1080;
  const IPAD_H = 810;
  const FRAME_PAD = 28 * 2; // padding on each side of frame
  const FRAME_BORDER = 40; // extra for border-radius visual space

  function scaleIPad() {
    const frame = document.querySelector('.ipad-frame');
    if (!frame) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 40; // viewport margin

    const totalW = IPAD_W + FRAME_BORDER;
    const totalH = IPAD_H + FRAME_BORDER;

    const scaleX = (vw - pad) / totalW;
    const scaleY = (vh - pad) / totalH;
    const s = Math.min(scaleX, scaleY, 1); // never scale above 1

    frame.style.transform = `scale(${s})`;
  }

  function scaleBrowser() {
    const frame = document.querySelector('.browser-frame');
    if (!frame) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 40;

    const scaleX = (vw - pad) / 1140;
    const scaleY = (vh - pad) / 760;
    const s = Math.min(scaleX, scaleY, 1);

    frame.style.transform = `scale(${s})`;
  }

  scaleIPad();
  scaleBrowser();
  window.addEventListener('resize', () => { scaleIPad(); scaleBrowser(); });

  // --- Master timeline ---
  const master = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. iPad frame entrance — subtle 3D rotation into place
  // Wrap animation uses a container so it doesn't conflict with responsive scale
  master.fromTo(
    '.ipad-container',
    { opacity: 0, scale: 0.88, rotateX: 8, rotateY: -4 },
    { opacity: 1, scale: 1, rotateX: 0, rotateY: 0, duration: 1.4, ease: 'power4.out' }
  );

  // 2. Header slides in
  master.to('.header', {
    opacity: 1,
    y: 0,
    duration: 0.6,
  }, '-=0.6');

  // 3. Filters bar
  master.to('.filters-bar', {
    opacity: 1,
    y: 0,
    duration: 0.5,
  }, '-=0.35');

  // 4. Nav tabs — stagger
  master.fromTo(
    '.nav-tab',
    { opacity: 0, y: -10 },
    { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
    '-=0.3'
  );

  // 5. Cards — stagger reveal
  master.to('.card', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    stagger: { amount: 0.5, from: 'start' },
    ease: 'back.out(1.4)',
  }, '-=0.2');

  // 6. Stat values — count-up animation
  master.add(() => {
    animateCounters();
  }, '-=0.3');

  // 7. Stat cards inner pop
  master.fromTo(
    '.stat-card, .stat-row, .gender-stat',
    { scale: 0.9, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.6)' },
    '-=0.5'
  );

  // 8. Trend badges
  master.fromTo(
    '.stat-trend',
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2)' },
    '-=0.3'
  );

  // --- Hover micro-interactions ---
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', duration: 0.3, ease: 'power2.out' });
    });
  });

  // Button export pulse
  document.querySelector('.btn-export')?.addEventListener('mouseenter', () => {
    gsap.fromTo('.btn-export', { scale: 1 }, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1 });
  });

  // --- Looping subtle idle animation on iPad ---
  gsap.to('.ipad-container', {
    rotateX: 1.5,
    rotateY: 1,
    duration: 4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 2,
  });

  // ============================================================
  // SQOOL Section — ScrollTrigger animations
  // ============================================================
  gsap.registerPlugin(ScrollTrigger);

  // Browser frame entrance
  gsap.to('.browser-container', {
    opacity: 1,
    duration: 0.01,
    scrollTrigger: {
      trigger: '#section-sqool',
      start: 'top 80%',
    },
  });

  gsap.fromTo('.browser-container',
    { scale: 0.9, rotateX: 6, rotateY: -3, opacity: 0 },
    {
      scale: 1, rotateX: 0, rotateY: 0, opacity: 1,
      duration: 1.2,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '#section-sqool',
        start: 'top 75%',
      },
    }
  );

  // SQOOL header
  gsap.to('.sqool-header', {
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#section-sqool',
      start: 'top 65%',
    },
  });

  // SQOOL cards stagger
  gsap.to('.sqool-card', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.8,
    stagger: 0.15,
    ease: 'back.out(1.4)',
    scrollTrigger: {
      trigger: '.sqool-cards-grid',
      start: 'top 80%',
    },
  });

  // SQOOL card hover interactions
  document.querySelectorAll('.sqool-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -8, scale: 1.03, duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    });
  });

  // Subtle idle float on browser
  gsap.to('.browser-container', {
    rotateX: 1,
    rotateY: 0.8,
    duration: 5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 3,
  });

  // ============================================================
  // Counter Animation
  // ============================================================
  function animateCounters() {
    document.querySelectorAll('.stat-value').forEach((el) => {
      const text = el.textContent.trim();
      // Match values like "1,4 M", "79%", "85%"
      const match = text.match(/^([\d,]+)\s*(%|M)?$/);
      if (!match) return;

      const numStr = match[1].replace(',', '.');
      const target = parseFloat(numStr);
      const suffix = match[2] || '';
      const hasComma = match[1].includes(',');

      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate() {
          let display;
          if (hasComma) {
            display = obj.val.toFixed(1).replace('.', ',');
          } else {
            display = Math.round(obj.val).toString();
          }
          el.textContent = display + (suffix === 'M' ? ' M' : suffix);
        },
      });
    });
  }

  // ============================================================
  // Section 3 — 5-Click Teacher/Student Animated Journey
  // iPadOS HIG spring physics · progressive disclosure · zoom
  // ============================================================
  (function initJourney() {
    const section = document.getElementById('section-journey');
    if (!section) return;

    // Elements
    const intro = section.querySelector('.journey-intro');
    const progress = section.querySelector('.journey-progress');
    const progressFill = section.querySelector('.journey-progress-fill');
    const dots = section.querySelectorAll('.journey-step-dot');
    const controls = section.querySelector('.journey-controls');
    const stepNum = document.getElementById('current-step-num');
    const teacherIPad = document.getElementById('ipad-teacher');
    const studentIPad = document.getElementById('ipad-student');
    const bridge = document.getElementById('journey-bridge');
    const btnReplay = document.getElementById('btn-replay');

    // Views
    const views = {
      teacher1: document.getElementById('teacher-step1'),
      teacher2: document.getElementById('teacher-step2'),
      teacher5: document.getElementById('teacher-step5'),
      student3: document.getElementById('student-step3'),
      student4: document.getElementById('student-step4'),
      student5: document.getElementById('student-step5'),
    };

    // Spring easing (iPadOS-style)
    const spring = 'elastic.out(1, 0.5)';
    const springShort = 'back.out(1.7)';
    const easeSmooth = 'power3.out';

    let currentStep = 0;
    let journeyTL = null;
    let hasPlayed = false;

    // --- Entrance animations (ScrollTrigger) ---
    gsap.to(intro, {
      opacity: 1, y: 0, duration: 0.8, ease: easeSmooth,
      scrollTrigger: { trigger: section, start: 'top 75%' }
    });

    gsap.to(progress, {
      opacity: 1, y: 0, duration: 0.6, ease: easeSmooth,
      scrollTrigger: { trigger: section, start: 'top 65%' }
    });

    gsap.to(controls, {
      opacity: 1, y: 0, duration: 0.6, ease: easeSmooth,
      scrollTrigger: { trigger: section, start: 'top 50%' }
    });

    // iPad entrances
    gsap.fromTo(teacherIPad,
      { opacity: 0, y: 50, rotateY: 6 },
      {
        opacity: 1, y: 0, rotateY: 0, duration: 1, ease: springShort,
        scrollTrigger: { trigger: '.journey-stage', start: 'top 70%' }
      }
    );
    gsap.fromTo(studentIPad,
      { opacity: 0, y: 50, rotateY: -6 },
      {
        opacity: 1, y: 0, rotateY: 0, duration: 1, ease: springShort, delay: 0.2,
        scrollTrigger: { trigger: '.journey-stage', start: 'top 70%' }
      }
    );
    gsap.to(bridge, {
      opacity: 1, duration: 0.5,
      scrollTrigger: { trigger: '.journey-stage', start: 'top 60%' }
    });

    // --- Journey auto-play triggered on scroll ---
    ScrollTrigger.create({
      trigger: '.journey-stage',
      start: 'top 50%',
      once: true,
      onEnter: () => {
        if (!hasPlayed) {
          hasPlayed = true;
          setTimeout(playJourney, 800);
        }
      }
    });

    // Replay button
    btnReplay?.addEventListener('click', () => {
      resetJourney();
      setTimeout(playJourney, 400);
    });

    // Dot click navigation
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const step = parseInt(dot.dataset.step);
        if (journeyTL) journeyTL.kill();
        resetJourney();
        jumpToStep(step);
      });
    });

    function setStep(n) {
      currentStep = n;
      if (stepNum) stepNum.textContent = n;
      progressFill.style.width = ((n / 5) * 100) + '%';
      dots.forEach(d => {
        const s = parseInt(d.dataset.step);
        d.classList.remove('active', 'done');
        if (s < n) d.classList.add('done');
        if (s === n) d.classList.add('active');
      });
    }

    function showView(id, direction) {
      const el = views[id];
      if (!el) return;
      el.classList.remove('hidden');
      gsap.fromTo(el,
        { opacity: 0, x: direction === 'left' ? -30 : 30, scale: 0.97 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: springShort }
      );
    }

    function hideView(id, direction) {
      const el = views[id];
      if (!el) return;
      gsap.to(el, {
        opacity: 0, x: direction === 'left' ? 30 : -30, scale: 0.97,
        duration: 0.3, ease: easeSmooth,
        onComplete: () => el.classList.add('hidden')
      });
    }

    function zoomIPad(ipadEl, zoomIn) {
      if (zoomIn) {
        ipadEl.classList.add('zoomed-in');
        gsap.to(ipadEl.querySelector('.journey-ipad-bezel'), {
          scale: 1.06, duration: 0.5, ease: spring
        });
      } else {
        ipadEl.classList.remove('zoomed-in');
        gsap.to(ipadEl.querySelector('.journey-ipad-bezel'), {
          scale: 1, duration: 0.4, ease: easeSmooth
        });
      }
    }

    function animateClick(czId, callback) {
      const zone = document.getElementById(czId);
      if (!zone) { callback?.(); return; }

      const cursor = zone.querySelector('.click-cursor');
      const ripple = zone.querySelector('.click-ripple');

      const tl = gsap.timeline({ onComplete: callback });

      // Cursor appears and moves to center
      tl.set(cursor, { opacity: 0, right: '-20px', bottom: '-20px' });
      tl.to(cursor, { opacity: 1, right: '30%', bottom: '40%', duration: 0.6, ease: 'power2.out' });

      // Click haptic
      tl.to(cursor, { scale: 0.85, duration: 0.08 });
      tl.to(cursor, { scale: 1, duration: 0.15, ease: springShort });

      // Ripple
      tl.to(ripple, { width: 200, height: 200, opacity: 0.4, duration: 0.05 }, '-=0.15');
      tl.to(ripple, { width: 300, height: 300, opacity: 0, duration: 0.4, ease: 'power2.out' });

      // Card press effect (iPadOS spring)
      tl.to(zone, { scale: 0.97, duration: 0.08 }, '-=0.5');
      tl.to(zone, { scale: 1, duration: 0.35, ease: spring }, '-=0.35');

      // Highlight zone briefly
      tl.set(zone, { className: '+=zoom-highlight' }, '-=0.5');
      tl.set(zone, { className: '-=zoom-highlight' }, '+=0.3');

      // Cursor exit
      tl.to(cursor, { opacity: 0, duration: 0.2 }, '-=0.2');

      // Reset ripple
      tl.set(ripple, { width: 0, height: 0, opacity: 0 });
    }

    function animateBridge() {
      const tl = gsap.timeline();
      const bridgeDots = bridge.querySelectorAll('.bridge-dot');
      const icon = bridge.querySelector('.bridge-icon');

      tl.to(icon, { scale: 1.2, duration: 0.3, ease: springShort });
      tl.fromTo(bridgeDots,
        { opacity: 0, x: -15 },
        { opacity: 1, x: 15, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
        '-=0.1'
      );
      tl.to(bridgeDots, { opacity: 0, duration: 0.2, stagger: 0.05 });
      tl.to(icon, { scale: 1, duration: 0.3, ease: easeSmooth }, '-=0.2');

      return tl;
    }

    function resetJourney() {
      if (journeyTL) journeyTL.kill();
      currentStep = 0;
      setStep(1);
      // Reset all views
      Object.keys(views).forEach(k => {
        const el = views[k];
        el.classList.add('hidden');
        gsap.set(el, { opacity: 0, x: 0, scale: 1 });
      });
      // Show default views
      views.teacher1.classList.remove('hidden');
      gsap.set(views.teacher1, { opacity: 1 });
      views.student3.classList.remove('hidden');
      gsap.set(views.student3, { opacity: 1 });
      // Reset notification
      gsap.set('#notif-banner', { opacity: 0, y: -20, scale: 0.95 });
      // Reset results ring
      gsap.set('.results-ring-fill', { strokeDashoffset: 264 });
      gsap.set('.feedback-ring-fill', { strokeDashoffset: 327 });
      // Reset zoom
      zoomIPad(teacherIPad, false);
      zoomIPad(studentIPad, false);
    }

    function playJourney() {
      resetJourney();

      journeyTL = gsap.timeline({ delay: 0.3 });

      // ===== STEP 1: Teacher clicks "Create Exercise" =====
      journeyTL.add(() => setStep(1));
      journeyTL.add(() => zoomIPad(teacherIPad, true));
      journeyTL.add(() => {}, '+=0.5');
      journeyTL.add(() => {
        return new Promise(resolve => {
          animateClick('cz-create', resolve);
        });
      });
      journeyTL.add(() => {}, '+=0.8');

      // ===== STEP 2: Form appears, teacher distributes =====
      journeyTL.add(() => setStep(2));
      journeyTL.add(() => {
        hideView('teacher1', 'left');
      });
      journeyTL.add(() => {}, '+=0.35');
      journeyTL.add(() => {
        showView('teacher2', 'right');
      });
      journeyTL.add(() => {}, '+=1.0');
      journeyTL.add(() => {
        return new Promise(resolve => {
          animateClick('cz-distribute', resolve);
        });
      });
      journeyTL.add(() => {}, '+=0.4');

      // Bridge animation: teacher → student
      journeyTL.add(() => zoomIPad(teacherIPad, false));
      journeyTL.add(animateBridge, '+=0.2');

      // ===== STEP 3: Student receives notification =====
      journeyTL.add(() => setStep(3));
      journeyTL.add(() => zoomIPad(studentIPad, true));
      // Notification banner slides in
      journeyTL.to('#notif-banner', {
        opacity: 1, y: 0, scale: 1,
        duration: 0.5, ease: spring
      }, '+=0.3');
      journeyTL.add(() => {}, '+=1.0');
      journeyTL.add(() => {
        return new Promise(resolve => {
          animateClick('cz-open', resolve);
        });
      });
      journeyTL.add(() => {}, '+=0.4');

      // ===== STEP 4: Student completes quiz =====
      journeyTL.add(() => setStep(4));
      journeyTL.add(() => {
        hideView('student3', 'left');
      });
      journeyTL.add(() => {}, '+=0.35');
      journeyTL.add(() => {
        showView('student4', 'right');
      });
      // Animate quiz options selection
      journeyTL.add(() => {}, '+=0.8');
      journeyTL.add(() => {
        return new Promise(resolve => {
          animateClick('cz-submit', resolve);
        });
      });
      journeyTL.add(() => {}, '+=0.4');

      // Bridge animation: student → teacher
      journeyTL.add(() => zoomIPad(studentIPad, false));
      journeyTL.add(animateBridge, '+=0.2');

      // ===== STEP 5: Both see results =====
      journeyTL.add(() => setStep(5));

      // Teacher sees results
      journeyTL.add(() => {
        hideView('teacher2', 'left');
      });
      journeyTL.add(() => {}, '+=0.2');
      journeyTL.add(() => {
        showView('teacher5', 'right');
      });

      // Student sees feedback
      journeyTL.add(() => {
        hideView('student4', 'left');
      }, '-=0.4');
      journeyTL.add(() => {}, '+=0.2');
      journeyTL.add(() => {
        showView('student5', 'right');
      });

      // Zoom both
      journeyTL.add(() => {
        zoomIPad(teacherIPad, true);
        zoomIPad(studentIPad, true);
      }, '+=0.2');

      // Animate results ring (teacher) — count to 82%
      journeyTL.to('.results-ring-fill', {
        strokeDashoffset: 264 - (264 * 0.82),
        duration: 1.2, ease: 'power2.out'
      }, '+=0.3');
      journeyTL.add(() => {
        const el = section.querySelector('.results-pct');
        if (el) {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: 82, duration: 1, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.v); }
          });
        }
      }, '-=1.2');

      // Animate feedback ring (student) — count to 95%
      journeyTL.to('.feedback-ring-fill', {
        strokeDashoffset: 327 - (327 * 0.95),
        duration: 1.2, ease: 'power2.out'
      }, '-=1.0');
      journeyTL.add(() => {
        const el = section.querySelector('.feedback-pct');
        if (el) {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: 95, duration: 1, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.v); }
          });
        }
      }, '-=1.2');

      // Teacher clicks a student row
      journeyTL.add(() => {}, '+=0.5');
      journeyTL.add(() => {
        return new Promise(resolve => {
          animateClick('cz-feedback', resolve);
        });
      });

      // Final: zoom out both
      journeyTL.add(() => {
        zoomIPad(teacherIPad, false);
        zoomIPad(studentIPad, false);
      }, '+=0.6');
    }

    function jumpToStep(step) {
      setStep(step);
      Object.keys(views).forEach(k => {
        views[k].classList.add('hidden');
        gsap.set(views[k], { opacity: 0, x: 0, scale: 1 });
      });
      gsap.set('#notif-banner', { opacity: 0, y: -20, scale: 0.95 });

      switch (step) {
        case 1:
          views.teacher1.classList.remove('hidden');
          gsap.set(views.teacher1, { opacity: 1 });
          views.student3.classList.remove('hidden');
          gsap.set(views.student3, { opacity: 1 });
          zoomIPad(teacherIPad, true);
          zoomIPad(studentIPad, false);
          break;
        case 2:
          views.teacher2.classList.remove('hidden');
          gsap.set(views.teacher2, { opacity: 1 });
          views.student3.classList.remove('hidden');
          gsap.set(views.student3, { opacity: 1 });
          zoomIPad(teacherIPad, true);
          zoomIPad(studentIPad, false);
          break;
        case 3:
          views.teacher2.classList.remove('hidden');
          gsap.set(views.teacher2, { opacity: 1 });
          views.student3.classList.remove('hidden');
          gsap.set(views.student3, { opacity: 1 });
          gsap.set('#notif-banner', { opacity: 1, y: 0, scale: 1 });
          zoomIPad(teacherIPad, false);
          zoomIPad(studentIPad, true);
          break;
        case 4:
          views.teacher2.classList.remove('hidden');
          gsap.set(views.teacher2, { opacity: 1 });
          views.student4.classList.remove('hidden');
          gsap.set(views.student4, { opacity: 1 });
          zoomIPad(teacherIPad, false);
          zoomIPad(studentIPad, true);
          break;
        case 5:
          views.teacher5.classList.remove('hidden');
          gsap.set(views.teacher5, { opacity: 1 });
          views.student5.classList.remove('hidden');
          gsap.set(views.student5, { opacity: 1 });
          gsap.set('.results-ring-fill', { strokeDashoffset: 264 - (264 * 0.82) });
          gsap.set('.feedback-ring-fill', { strokeDashoffset: 327 - (327 * 0.95) });
          const rp = section.querySelector('.results-pct');
          if (rp) rp.textContent = '82';
          const fp = section.querySelector('.feedback-pct');
          if (fp) fp.textContent = '95';
          zoomIPad(teacherIPad, true);
          zoomIPad(studentIPad, true);
          break;
      }
    }
  })();

  // ============================================================
  // WebGL Particle Background — Floating light particles
  // ============================================================
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) { console.warn('WebGL not supported'); return; }

  // Resize
  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // Shaders
  const vsSource = `
    attribute vec2 aPosition;
    attribute float aSize;
    attribute float aAlpha;
    uniform vec2 uResolution;
    varying float vAlpha;
    void main() {
      vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
      clip.y = -clip.y;
      gl_Position = vec4(clip, 0.0, 1.0);
      gl_PointSize = aSize;
      vAlpha = aAlpha;
    }
  `;

  const fsSource = `
    precision mediump float;
    varying float vAlpha;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;
      gl_FragColor = vec4(0.91, 0.22, 0.35, alpha * 0.35);
    }
  `;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const vs = compileShader(vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const aPosition = gl.getAttribLocation(prog, 'aPosition');
  const aSize = gl.getAttribLocation(prog, 'aSize');
  const aAlpha = gl.getAttribLocation(prog, 'aAlpha');
  const uResolution = gl.getUniformLocation(prog, 'uResolution');

  // Particles
  const COUNT = 60;
  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth * devicePixelRatio,
      y: Math.random() * window.innerHeight * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.15,
      size: Math.random() * 4 + 1.5,
      alpha: Math.random() * 0.6 + 0.2,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
    });
  }

  const posBuf = gl.createBuffer();
  const sizeBuf = gl.createBuffer();
  const alphaBuf = gl.createBuffer();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function drawParticles(t) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uResolution, canvas.width, canvas.height);

    const positions = new Float32Array(COUNT * 2);
    const sizes = new Float32Array(COUNT);
    const alphas = new Float32Array(COUNT);

    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      p.x += p.vx + Math.sin(t * 0.0008 + p.phaseX) * 0.3;
      p.y += p.vy + Math.cos(t * 0.0006 + p.phaseY) * 0.2;

      // Wrap around
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      positions[i * 2] = p.x;
      positions[i * 2 + 1] = p.y;
      sizes[i] = p.size * devicePixelRatio;
      alphas[i] = p.alpha * (0.7 + 0.3 * Math.sin(t * 0.001 + p.phaseX));
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuf);
    gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aAlpha);
    gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  // Render loop
  function loop(t) {
    drawParticles(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
