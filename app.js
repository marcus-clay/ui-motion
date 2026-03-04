// ============================================================
// GSAP Animations — Komète Dashboard iPad Mockup
// ============================================================

(function () {
  'use strict';

  // --- Master timeline ---
  const master = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. iPad frame entrance — subtle 3D rotation into place
  master.fromTo(
    '.ipad-frame',
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
  gsap.to('.ipad-frame', {
    rotateX: 1.5,
    rotateY: 1,
    duration: 4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 2,
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
