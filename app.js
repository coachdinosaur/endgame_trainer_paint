(() => {
  'use strict';

  const SIZE = 900;
  const INSET = 92;
  const PAINT_DURATION = 4700;
  const HOLD_AFTER_PAINT = 650;
  const TAU = Math.PI * 2;

  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('logoCanvas');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('status');
  const error = document.getElementById('error');
  const copyZone = document.getElementById('copyZone');
  const brandLine = document.getElementById('brandLine');
  const titleLine = document.getElementById('titleLine');
  const taglineLine = document.getElementById('taglineLine');

  const mask = document.createElement('canvas');
  const m = mask.getContext('2d');
  const painted = document.createElement('canvas');
  const p = painted.getContext('2d');
  mask.width = painted.width = SIZE;
  mask.height = painted.height = SIZE;

  const img = new Image();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const BRAND_TEXT = "COACHDINOSAUR'S";
  const TITLE_TEXT = 'Endgame Trainer';
  const TAGLINE_TEXT = 'Train basic and practical endgames step\nby step.';

  let paintStart = 0;
  let sequenceStarted = false;

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const ease = (value) => {
    const t = clamp(value);
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  const phase = (value, start, end) => smooth((value - start) / (end - start));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function drawBackground(time) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const glow = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 28, SIZE / 2, SIZE / 2, SIZE * 0.45);
    glow.addColorStop(0, 'rgba(35,255,169,0.075)');
    glow.addColorStop(0.62, 'rgba(15,103,73,0.022)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(time * 0.00008);
    ctx.strokeStyle = 'rgba(110,255,195,0.032)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 348, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function buildMask(progress) {
    m.clearRect(0, 0, SIZE, SIZE);
    m.save();
    m.lineCap = 'round';
    m.lineJoin = 'round';

    const ring = phase(progress, 0, 0.34);
    if (ring > 0) {
      m.strokeStyle = '#fff';
      m.lineWidth = 126;
      m.beginPath();
      m.arc(SIZE / 2, SIZE / 2, 348, -Math.PI / 2, -Math.PI / 2 + TAU * ease(ring));
      m.stroke();
    }

    const scan = phase(progress, 0.2, 0.9);
    if (scan > 0) {
      const y = INSET + (SIZE - INSET * 2) * ease(scan);
      const feather = 92;

      m.fillStyle = '#fff';
      m.fillRect(INSET, INSET, SIZE - INSET * 2, Math.max(0, y - INSET - feather * 0.55));

      const gradient = m.createLinearGradient(0, y - feather, 0, y + feather);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.56, 'rgba(255,255,255,0.94)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = gradient;
      m.fillRect(INSET, y - feather, SIZE - INSET * 2, feather * 2);
    }

    const finish = phase(progress, 0.84, 1);
    if (finish > 0) {
      m.fillStyle = `rgba(255,255,255,${finish})`;
      m.fillRect(INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2);
    }

    m.restore();
  }

  function drawLogo(progress, time) {
    p.clearRect(0, 0, SIZE, SIZE);
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha = 1;
    p.drawImage(img, INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2);
    p.globalCompositeOperation = 'destination-in';
    p.drawImage(mask, 0, 0);
    p.globalCompositeOperation = 'source-over';

    const settled = phase(progress, 0.84, 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.0036);

    ctx.save();
    ctx.globalAlpha = 0.46 + settled * 0.2;
    ctx.shadowColor = '#5effb8';
    ctx.shadowBlur = 24 + settled * 16 + pulse * 3;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();
  }

  function drawBrushes(progress) {
    const ring = phase(progress, 0, 0.34);
    if (ring > 0 && ring < 1) {
      const angle = -Math.PI / 2 + TAU * ease(ring);
      const x = SIZE / 2 + Math.cos(angle) * 348;
      const y = SIZE / 2 + Math.sin(angle) * 348;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 38);
      glow.addColorStop(0, 'rgba(235,255,245,0.96)');
      glow.addColorStop(0.22, 'rgba(105,255,192,0.64)');
      glow.addColorStop(1, 'rgba(70,255,178,0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 38, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const scan = phase(progress, 0.2, 0.9);
    if (scan > 0 && scan < 1) {
      const y = INSET + (SIZE - INSET * 2) * ease(scan);
      const left = INSET + 20;
      const right = SIZE - INSET - 20;
      const line = ctx.createLinearGradient(left, y, right, y);
      line.addColorStop(0, 'rgba(105,255,193,0)');
      line.addColorStop(0.18, 'rgba(105,255,193,0.2)');
      line.addColorStop(0.5, 'rgba(230,255,242,0.8)');
      line.addColorStop(0.82, 'rgba(105,255,193,0.2)');
      line.addColorStop(1, 'rgba(105,255,193,0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#65ffbc';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function render(progress, time) {
    buildMask(progress);
    drawBackground(time);
    drawLogo(progress, time);
    drawBrushes(progress);
  }

  function finalFrame() {
    render(1, performance.now());
  }

  function delayForCharacter(char, base) {
    if (char === ' ') return Math.max(18, base * 0.45);
    if (char === '\n') return base * 3.2;
    if (',.!?'.includes(char)) return base * 2.1;
    return base;
  }

  async function typeLine(element, text, baseSpeed) {
    element.textContent = '';
    element.classList.add('typing');

    for (const char of text) {
      element.textContent += char;
      await wait(delayForCharacter(char, baseSpeed));
    }

    element.classList.remove('typing');
  }

  async function revealCopy() {
    if (sequenceStarted) return;
    sequenceStarted = true;

    hero.classList.add('reveal');
    copyZone.setAttribute('aria-hidden', 'false');
    status.textContent = 'Showing app title.';

    await wait(260);
    await typeLine(brandLine, BRAND_TEXT, 30);
    await wait(70);
    await typeLine(titleLine, TITLE_TEXT, 48);
    await wait(120);
    await typeLine(taglineLine, TAGLINE_TEXT, 24);
    status.textContent = 'Coach Dinosaur Endgame Trainer intro complete.';
  }

  function frame(now) {
    if (!paintStart) paintStart = now;
    const progress = clamp((now - paintStart) / PAINT_DURATION);
    render(progress, now);

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    finalFrame();
    status.textContent = 'Endgame Trainer logo painting complete.';
    setTimeout(revealCopy, HOLD_AFTER_PAINT);
  }

  function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
    status.textContent = message;
  }

  function showStaticAccessibleVersion() {
    finalFrame();
    hero.classList.add('reveal');
    copyZone.setAttribute('aria-hidden', 'false');
    brandLine.textContent = BRAND_TEXT;
    titleLine.textContent = TITLE_TEXT;
    taglineLine.textContent = TAGLINE_TEXT;
    status.textContent = 'Coach Dinosaur Endgame Trainer displayed.';
  }

  img.onload = () => {
    error.style.display = 'none';

    if (reducedMotion) {
      showStaticAccessibleVersion();
      return;
    }

    requestAnimationFrame(frame);
  };

  img.onerror = () => {
    showError('The logo could not be loaded.');
  };

  if (!window.LOGO_B64) {
    showError('The logo could not be loaded.');
    return;
  }

  img.src = 'data:image/webp;base64,' + window.LOGO_B64;
})();
