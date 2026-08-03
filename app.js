(() => {
  "use strict";

  const SIZE = 900;
  const IMAGE_INSET = 82;
  const PAINT_DURATION = 6800;
  const HOLD_DURATION = 2400;
  const RESET_DURATION = 650;
  const CYCLE_DURATION = PAINT_DURATION + HOLD_DURATION + RESET_DURATION;
  const TAU = Math.PI * 2;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const logo = document.getElementById("logoSource");
  const status = document.getElementById("animationStatus");

  const mask = document.createElement("canvas");
  const maskCtx = mask.getContext("2d");
  const painted = document.createElement("canvas");
  const paintedCtx = painted.getContext("2d");
  mask.width = painted.width = SIZE;
  mask.height = painted.height = SIZE;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cycleStart = performance.now();
  let completionAnnounced = false;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  function smoothstep(value) {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  }

  function easeInOutCubic(value) {
    const t = clamp01(value);
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function phase(progress, start, end) {
    return smoothstep((progress - start) / (end - start));
  }

  function drawBackground(time) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const centerGlow = ctx.createRadialGradient(
      SIZE / 2,
      SIZE / 2,
      20,
      SIZE / 2,
      SIZE / 2,
      SIZE * 0.46
    );
    centerGlow.addColorStop(0, "rgba(39,255,171,0.075)");
    centerGlow.addColorStop(0.58, "rgba(15,103,73,0.025)");
    centerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(time * 0.00009);
    const sweep = ctx.createConicGradient(-0.1, 0, 0);
    sweep.addColorStop(0, "rgba(100,255,193,0)");
    sweep.addColorStop(0.035, "rgba(100,255,193,0.04)");
    sweep.addColorStop(0.11, "rgba(100,255,193,0)");
    sweep.addColorStop(1, "rgba(100,255,193,0)");
    ctx.fillStyle = sweep;
    ctx.beginPath();
    ctx.arc(0, 0, SIZE * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function buildRevealMask(progress) {
    maskCtx.clearRect(0, 0, SIZE, SIZE);
    maskCtx.save();
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";

    const ringProgress = phase(progress, 0, 0.34);
    if (ringProgress > 0) {
      const eased = easeInOutCubic(ringProgress);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + TAU * eased;

      maskCtx.strokeStyle = "rgba(255,255,255,1)";
      maskCtx.lineWidth = 118;
      maskCtx.beginPath();
      maskCtx.arc(SIZE / 2, SIZE / 2, 350, startAngle, endAngle);
      maskCtx.stroke();
    }

    const scanProgress = phase(progress, 0.23, 0.86);
    if (scanProgress > 0) {
      const eased = easeInOutCubic(scanProgress);
      const left = IMAGE_INSET;
      const right = SIZE - IMAGE_INSET;
      const top = IMAGE_INSET;
      const bottom = SIZE - IMAGE_INSET;
      const feather = 84;
      const scanY = top + (bottom - top) * eased;

      maskCtx.fillStyle = "rgba(255,255,255,1)";
      maskCtx.fillRect(left, top, right - left, Math.max(0, scanY - top - feather * 0.55));

      const gradient = maskCtx.createLinearGradient(0, scanY - feather, 0, scanY + feather);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.58, "rgba(255,255,255,0.92)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(left, scanY - feather, right - left, feather * 2);
    }

    const finishProgress = phase(progress, 0.80, 1);
    if (finishProgress > 0) {
      maskCtx.fillStyle = `rgba(255,255,255,${finishProgress})`;
      maskCtx.fillRect(
        IMAGE_INSET,
        IMAGE_INSET,
        SIZE - IMAGE_INSET * 2,
        SIZE - IMAGE_INSET * 2
      );
    }

    maskCtx.restore();
  }

  function drawPaintedLogo(progress, time, opacity) {
    paintedCtx.clearRect(0, 0, SIZE, SIZE);
    paintedCtx.globalCompositeOperation = "source-over";
    paintedCtx.globalAlpha = 1;
    paintedCtx.drawImage(
      logo,
      IMAGE_INSET,
      IMAGE_INSET,
      SIZE - IMAGE_INSET * 2,
      SIZE - IMAGE_INSET * 2
    );
    paintedCtx.globalCompositeOperation = "destination-in";
    paintedCtx.drawImage(mask, 0, 0);
    paintedCtx.globalCompositeOperation = "source-over";

    const settled = phase(progress, 0.84, 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.0038);

    ctx.save();
    ctx.globalAlpha = opacity * (0.48 + settled * 0.18);
    ctx.shadowColor = "#5dffb8";
    ctx.shadowBlur = 24 + settled * 16 + pulse * 3;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();
  }

  function drawRingBrush(progress, time, opacity) {
    const ringProgress = phase(progress, 0, 0.34);
    if (ringProgress <= 0 || ringProgress >= 1) return;

    const eased = easeInOutCubic(ringProgress);
    const angle = -Math.PI / 2 + TAU * eased;
    const radius = 350;
    const x = SIZE / 2 + Math.cos(angle) * radius;
    const y = SIZE / 2 + Math.sin(angle) * radius;
    const pulse = 1 + Math.sin(time * 0.015) * 0.08;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "screen";

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 42 * pulse);
    glow.addColorStop(0, "rgba(231,255,243,0.98)");
    glow.addColorStop(0.18, "rgba(110,255,194,0.72)");
    glow.addColorStop(0.55, "rgba(63,255,174,0.18)");
    glow.addColorStop(1, "rgba(63,255,174,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 42 * pulse, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(181,255,220,0.74)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#62ffba";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawScanBrush(progress, time, opacity) {
    const scanProgress = phase(progress, 0.23, 0.86);
    if (scanProgress <= 0 || scanProgress >= 1) return;

    const eased = easeInOutCubic(scanProgress);
    const left = IMAGE_INSET + 22;
    const right = SIZE - IMAGE_INSET - 22;
    const top = IMAGE_INSET;
    const bottom = SIZE - IMAGE_INSET;
    const y = top + (bottom - top) * eased;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "screen";

    const line = ctx.createLinearGradient(left, y, right, y);
    line.addColorStop(0, "rgba(100,255,192,0)");
    line.addColorStop(0.18, "rgba(100,255,192,0.24)");
    line.addColorStop(0.5, "rgba(215,255,236,0.82)");
    line.addColorStop(0.82, "rgba(100,255,192,0.24)");
    line.addColorStop(1, "rgba(100,255,192,0)");

    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#66ffbd";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    const centerX = SIZE / 2 + Math.sin(time * 0.003) * 28;
    const glow = ctx.createRadialGradient(centerX, y, 0, centerX, y, 34);
    glow.addColorStop(0, "rgba(235,255,245,0.9)");
    glow.addColorStop(0.25, "rgba(102,255,191,0.55)");
    glow.addColorStop(1, "rgba(102,255,191,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, y, 34, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawCompletionPulse(progress, time, opacity) {
    const finished = phase(progress, 0.88, 1);
    if (finished <= 0) return;

    const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
    ctx.save();
    ctx.globalAlpha = opacity * finished * (0.11 + pulse * 0.045);
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "#8affcb";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#66ffbc";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, 355 + pulse * 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function getCycleState(now) {
    if (reducedMotion) {
      return { progress: 1, opacity: 1 };
    }

    const elapsed = (now - cycleStart) % CYCLE_DURATION;
    if (elapsed <= PAINT_DURATION) {
      return {
        progress: clamp01(elapsed / PAINT_DURATION),
        opacity: 1
      };
    }

    if (elapsed <= PAINT_DURATION + HOLD_DURATION) {
      return { progress: 1, opacity: 1 };
    }

    const resetElapsed = elapsed - PAINT_DURATION - HOLD_DURATION;
    return {
      progress: 1,
      opacity: 1 - smoothstep(resetElapsed / RESET_DURATION)
    };
  }

  function render(now) {
    const { progress, opacity } = getCycleState(now);

    buildRevealMask(progress);
    drawBackground(now);
    drawPaintedLogo(progress, now, opacity);
    drawRingBrush(progress, now, opacity);
    drawScanBrush(progress, now, opacity);
    drawCompletionPulse(progress, now, opacity);

    if (progress >= 1 && !completionAnnounced) {
      status.textContent = "Endgame Trainer logo painting complete.";
      completionAnnounced = true;
    } else if (progress < 0.04) {
      status.textContent = "Painting the Endgame Trainer logo.";
      completionAnnounced = false;
    }

    requestAnimationFrame(render);
  }

  function start() {
    cycleStart = performance.now();
    if (reducedMotion) {
      status.textContent = "Endgame Trainer logo displayed.";
    }
    requestAnimationFrame(render);
  }

  function loadLogo() {
    if (!window.LOGO_B64) {
      status.textContent = "The Endgame Trainer logo could not be loaded.";
      return;
    }

    logo.addEventListener("load", start, { once: true });
    logo.src = `data:image/webp;base64,${window.LOGO_B64}`;
  }

  loadLogo();
})();
