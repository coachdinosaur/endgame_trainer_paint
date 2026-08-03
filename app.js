(() => {
  'use strict';

  const SIZE = 900;
  const INSET = 92;
  const NORMAL_PAINT_DURATION = 5600;
  const REDUCED_PAINT_DURATION = 1900;
  const HOLD_AFTER_PAINT = 720;
  const TAU = Math.PI * 2;
  const BAND_COUNT = 11;

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
  const maskCtx = mask.getContext('2d');
  const painted = document.createElement('canvas');
  const paintedCtx = painted.getContext('2d');
  mask.width = painted.width = SIZE;
  mask.height = painted.height = SIZE;

  const image = new Image();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paintDuration = reducedMotion ? REDUCED_PAINT_DURATION : NORMAL_PAINT_DURATION;

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
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  function drawBackground(time) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const glow = ctx.createRadialGradient(
      SIZE / 2,
      SIZE / 2,
      26,
      SIZE / 2,
      SIZE / 2,
      SIZE * 0.46
    );
    glow.addColorStop(0, 'rgba(35,255,169,0.085)');
    glow.addColorStop(0.6, 'rgba(15,103,73,0.025)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(time * 0.00007);
    ctx.strokeStyle = 'rgba(110,255,195,0.034)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 350, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function fillBand(left, top, width, height, progress, reverse) {
    if (progress <= 0) return;

    const eased = ease(progress);
    const feather = 30;
    const amount = width * eased;

    maskCtx.save();
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    if (!reverse) {
      const solidWidth = Math.max(0, amount - feather);
      maskCtx.fillStyle = '#fff';
      maskCtx.fillRect(left, top, solidWidth, height);

      const edgeStart = left + solidWidth;
      const gradient = maskCtx.createLinearGradient(edgeStart, 0, edgeStart + feather, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.65, 'rgba(255,255,255,0.88)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(edgeStart, top, Math.min(feather, amount), height);
    } else {
      const solidWidth = Math.max(0, amount - feather);
      maskCtx.fillStyle = '#fff';
      maskCtx.fillRect(left + width - solidWidth, top, solidWidth, height);

      const edgeEnd = left + width - solidWidth;
      const gradient = maskCtx.createLinearGradient(edgeEnd - feather, 0, edgeEnd, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.35, 'rgba(255,255,255,0.88)');
      gradient.addColorStop(1, 'rgba(255,255,255,1)');
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(Math.max(left, edgeEnd - feather), top, Math.min(feather, amount), height);
    }

    maskCtx.restore();
  }

  function buildMask(progress) {
    maskCtx.clearRect(0, 0, SIZE, SIZE);

    const ringProgress = phase(progress, 0, 0.28);
    if (ringProgress > 0) {
      maskCtx.save();
      maskCtx.strokeStyle = '#fff';
      maskCtx.lineWidth = 126;
      maskCtx.lineCap = 'round';
      maskCtx.beginPath();
      maskCtx.arc(
        SIZE / 2,
        SIZE / 2,
        348,
        -Math.PI / 2,
        -Math.PI / 2 + TAU * ease(ringProgress)
      );
      maskCtx.stroke();
      maskCtx.restore();
    }

    const paintProgress = phase(progress, 0.16, 0.94);
    if (paintProgress > 0) {
      const left = INSET;
      const top = INSET;
      const width = SIZE - INSET * 2;
      const height = SIZE - INSET * 2;
      const bandHeight = height / BAND_COUNT;
      const scaled = paintProgress * BAND_COUNT;
      const completedBands = Math.floor(scaled);
      const activeProgress = scaled - completedBands;

      for (let band = 0; band < BAND_COUNT; band += 1) {
        const bandTop = top + band * bandHeight - 1;
        const currentProgress = band < completedBands
          ? 1
          : band === completedBands
            ? activeProgress
            : 0;

        fillBand(
          left,
          bandTop,
          width,
          bandHeight + 3,
          currentProgress,
          band % 2 === 1
        );
      }
    }

    const finishProgress = phase(progress, 0.9, 1);
    if (finishProgress > 0) {
      maskCtx.fillStyle = `rgba(255,255,255,${finishProgress})`;
      maskCtx.fillRect(INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2);
    }
  }

  function drawPaintedLogo(progress, time) {
    paintedCtx.clearRect(0, 0, SIZE, SIZE);
    paintedCtx.globalCompositeOperation = 'source-over';
    paintedCtx.globalAlpha = 1;
    paintedCtx.drawImage(image, INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2);
    paintedCtx.globalCompositeOperation = 'destination-in';
    paintedCtx.drawImage(mask, 0, 0);
    paintedCtx.globalCompositeOperation = 'source-over';

    const settled = phase(progress, 0.88, 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.0035);

    ctx.save();
    ctx.globalAlpha = 0.52 + settled * 0.16;
    ctx.shadowColor = '#5effb8';
    ctx.shadowBlur = 25 + settled * 15 + pulse * 3;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();
  }

  function drawRingBrush(progress) {
    const ringProgress = phase(progress, 0, 0.28);
    if (ringProgress <= 0 || ringProgress >= 1) return;

    const angle = -Math.PI / 2 + TAU * ease(ringProgress);
    const x = SIZE / 2 + Math.cos(angle) * 348;
    const y = SIZE / 2 + Math.sin(angle) * 348;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 44);
    glow.addColorStop(0, 'rgba(245,255,249,0.98)');
    glow.addColorStop(0.18, 'rgba(115,255,197,0.76)');
    glow.addColorStop(0.6, 'rgba(62,255,175,0.18)');
    glow.addColorStop(1, 'rgba(62,255,175,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBandBrush(progress, time) {
    const paintProgress = phase(progress, 0.16, 0.94);
    if (paintProgress <= 0 || paintProgress >= 1) return;

    const left = INSET;
    const top = INSET;
    const width = SIZE - INSET * 2;
    const height = SIZE - INSET * 2;
    const bandHeight = height / BAND_COUNT;
    const scaled = paintProgress * BAND_COUNT;
    const activeBand = Math.min(BAND_COUNT - 1, Math.floor(scaled));
    const localProgress = scaled - Math.floor(scaled);
    const reverse = activeBand % 2 === 1;
    const eased = ease(localProgress);
    const x = reverse
      ? left + width * (1 - eased)
      : left + width * eased;
    const y = top + activeBand * bandHeight + bandHeight / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
    glow.addColorStop(0, 'rgba(247,255,250,0.98)');
    glow.addColorStop(0.18, 'rgba(112,255,197,0.78)');
    glow.addColorStop(0.52, 'rgba(58,255,174,0.22)');
    glow.addColorStop(1, 'rgba(58,255,174,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(220,255,238,0.78)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#67ffbd';
    ctx.shadowBlur = 12;

    const direction = reverse ? -1 : 1;
    const bristleLength = 36;
    for (let bristle = -4; bristle <= 4; bristle += 1) {
      const offsetY = bristle * 5.2;
      const wobble = Math.sin(time * 0.01 + bristle) * 1.8;
      ctx.beginPath();
      ctx.moveTo(-direction * 4, offsetY);
      ctx.lineTo(-direction * bristleLength, offsetY + wobble);
      ctx.stroke();
    }

    ctx.restore();
  }

  function render(progress, time) {
    buildMask(progress);
    drawBackground(time);
    drawPaintedLogo(progress, time);
    drawRingBrush(progress);
    drawBandBrush(progress, time);
  }

  function finalFrame() {
    render(1, performance.now());
  }

  function characterDelay(character, baseDelay) {
    if (character === ' ') return Math.max(18, baseDelay * 0.45);
    if (character === '\n') return baseDelay * 3;
    if (',.!?'.includes(character)) return baseDelay * 2;
    return baseDelay;
  }

  async function typeLine(element, text, baseDelay) {
    element.textContent = '';
    element.classList.add('typing');

    for (const character of text) {
      element.textContent += character;
      await wait(characterDelay(character, baseDelay));
    }

    element.classList.remove('typing');
  }

  async function revealCopy() {
    if (sequenceStarted) return;
    sequenceStarted = true;

    hero.classList.add('reveal');
    copyZone.setAttribute('aria-hidden', 'false');
    status.textContent = 'Showing app title.';

    await wait(280);
    await typeLine(brandLine, BRAND_TEXT, reducedMotion ? 12 : 30);
    await wait(70);
    await typeLine(titleLine, TITLE_TEXT, reducedMotion ? 18 : 48);
    await wait(120);
    await typeLine(taglineLine, TAGLINE_TEXT, reducedMotion ? 10 : 24);
    status.textContent = 'Coach Dinosaur Endgame Trainer intro complete.';
  }

  function frame(now) {
    if (!paintStart) paintStart = now;
    const progress = clamp((now - paintStart) / paintDuration);
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

  image.onload = () => {
    error.style.display = 'none';
    requestAnimationFrame(frame);
  };

  image.onerror = () => {
    showError('The logo could not be loaded.');
  };

  if (!window.LOGO_B64) {
    showError('The logo could not be loaded.');
    return;
  }

  image.src = 'data:image/webp;base64,' + window.LOGO_B64;
})();
