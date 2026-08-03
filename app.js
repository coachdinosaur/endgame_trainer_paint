(() => {
  "use strict";

  const SIZE = 900;
  const DURATION = 9000;
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  const logo = document.getElementById("logoSource");
  const playPause = document.getElementById("playPause");
  const replay = document.getElementById("replay");
  const progressInput = document.getElementById("progress");
  const speedSelect = document.getElementById("speed");
  const status = document.getElementById("status");

  const mask = document.createElement("canvas");
  const maskCtx = mask.getContext("2d");
  const painted = document.createElement("canvas");
  const paintedCtx = painted.getContext("2d");
  mask.width = painted.width = SIZE;
  mask.height = painted.height = SIZE;

  let strokes = [];
  let totalLength = 0;
  let currentProgress = 0;
  let lastPaintedProgress = 0;
  let playing = true;
  let speed = 1;
  let lastTime = performance.now();
  let particles = [];
  let shimmerPhase = 0;

  function P(x, y) { return { x: x * SIZE, y: y * SIZE }; }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function makeLine(x1, y1, x2, y2, steps = 40) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(P(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t));
    }
    return points;
  }

  function makeArc(cx, cy, r, a1, a2, steps = 120) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a1 + (a2 - a1) * t;
      points.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    return points;
  }

  function makePolyline(coords, stepsPerSegment = 18) {
    const points = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];
      const segment = makeLine(x1, y1, x2, y2, stepsPerSegment);
      if (i) segment.shift();
      points.push(...segment);
    }
    return points;
  }

  function addStroke(points, width, energy = 1) {
    let length = 0;
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      length += distance(points[i - 1], points[i]);
      cumulative.push(length);
    }
    strokes.push({
      points,
      width: width * SIZE,
      energy,
      length,
      cumulative,
      start: totalLength,
      end: totalLength + length
    });
    totalLength += length;
  }

  function buildStrokes() {
    strokes = [];
    totalLength = 0;

    addStroke(makeArc(.5, .5, .436, -Math.PI / 2, Math.PI * 1.5, 180), .030, 1.2);
    addStroke(makeArc(.5, .5, .405, Math.PI * 1.5, -Math.PI / 2, 170), .024, 1.1);
    addStroke(makeArc(.5, .5, .365, -Math.PI / 2, Math.PI * 1.5, 150), .017, .9);

    addStroke(makePolyline([
      [.50,.18], [.50,.31], [.46,.40], [.44,.56], [.40,.71], [.36,.80]
    ]), .052, 1.2);
    addStroke(makePolyline([
      [.50,.18], [.50,.31], [.54,.40], [.56,.56], [.60,.71], [.64,.80]
    ]), .052, 1.2);
    addStroke(makeLine(.36,.80,.64,.80,60), .060, 1);
    addStroke(makeLine(.40,.72,.60,.72,44), .050, 1);
    addStroke(makeLine(.43,.44,.57,.44,36), .050, 1);
    addStroke(makePolyline([
      [.43,.39], [.39,.29], [.45,.34], [.50,.20], [.55,.34], [.61,.29], [.57,.39]
    ]), .045, 1.25);

    addStroke(makePolyline([
      [.34,.42], [.27,.38], [.18,.39], [.14,.46], [.17,.52], [.24,.53],
      [.20,.59], [.29,.55], [.36,.49]
    ]), .050, 1.15);
    addStroke(makePolyline([
      [.16,.47], [.21,.47], [.25,.44], [.30,.43]
    ]), .034, 1);

    addStroke(makeArc(.73,.50,.094,-Math.PI/2,Math.PI*1.5,90), .034, 1.05);
    addStroke(makeArc(.73,.50,.047,-Math.PI/2,Math.PI*1.5,70), .028, 1.05);
    addStroke(makeLine(.63,.50,.83,.50,40), .018, .9);
    addStroke(makeLine(.73,.40,.73,.60,40), .018, .9);

    const top = .105, bottom = .895, left = .105, right = .895;
    let reverse = false;
    for (let y = top; y <= bottom; y += .022) {
      const wobble = Math.sin(y * 80) * .008;
      const a = reverse ? right : left;
      const b = reverse ? left : right;
      addStroke(
        makePolyline([
          [a, y],
          [.34, y + wobble],
          [.52, y - wobble * .7],
          [.70, y + wobble * .5],
          [b, y]
        ], 10),
        .032,
        .55
      );
      reverse = !reverse;
    }

    for (let i = 0; i < 7; i++) {
      const shift = i * .075;
      addStroke(makeLine(.18 + shift, .78, .55 + shift, .22, 60), .018, .75);
    }
  }

  function resetMask() {
    maskCtx.clearRect(0, 0, SIZE, SIZE);
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    lastPaintedProgress = 0;
  }

  function findPoint(stroke, localDistance) {
    if (localDistance <= 0) return stroke.points[0];
    if (localDistance >= stroke.length) return stroke.points[stroke.points.length - 1];

    let lo = 1, hi = stroke.cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (stroke.cumulative[mid] < localDistance) lo = mid + 1;
      else hi = mid;
    }

    const i = lo;
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    const span = stroke.cumulative[i] - stroke.cumulative[i - 1] || 1;
    const t = (localDistance - stroke.cumulative[i - 1]) / span;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  function drawStrokeRange(stroke, fromDistance, toDistance) {
    if (toDistance <= fromDistance) return;

    maskCtx.save();
    maskCtx.strokeStyle = "rgba(255,255,255,1)";
    maskCtx.lineWidth = stroke.width;
    maskCtx.shadowColor = "rgba(255,255,255,.75)";
    maskCtx.shadowBlur = stroke.width * .24;
    maskCtx.beginPath();

    const startPoint = findPoint(stroke, fromDistance);
    maskCtx.moveTo(startPoint.x, startPoint.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const d = stroke.cumulative[i];
      if (d > fromDistance && d < toDistance) {
        maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
    }

    const endPoint = findPoint(stroke, toDistance);
    maskCtx.lineTo(endPoint.x, endPoint.y);
    maskCtx.stroke();
    maskCtx.restore();
  }

  function paintBetween(fromProgress, toProgress) {
    if (toProgress < fromProgress) {
      resetMask();
      fromProgress = 0;
    }

    const fromDistance = fromProgress * totalLength;
    const toDistance = toProgress * totalLength;

    for (const stroke of strokes) {
      if (stroke.end <= fromDistance || stroke.start >= toDistance) continue;
      const localFrom = Math.max(0, fromDistance - stroke.start);
      const localTo = Math.min(stroke.length, toDistance - stroke.start);
      drawStrokeRange(stroke, localFrom, localTo);
    }

    lastPaintedProgress = toProgress;
  }

  function getBrushState(progress) {
    const target = Math.min(totalLength - .001, progress * totalLength);
    let stroke = strokes[strokes.length - 1];
    for (const item of strokes) {
      if (target >= item.start && target <= item.end) {
        stroke = item;
        break;
      }
    }
    const local = Math.max(0, Math.min(stroke.length, target - stroke.start));
    const point = findPoint(stroke, local);
    return { ...point, width: stroke.width, energy: stroke.energy };
  }

  function spawnParticles(brush) {
    const count = Math.max(1, Math.round(brush.energy * 2));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 65;
      particles.push({
        x: brush.x + (Math.random() - .5) * brush.width * .5,
        y: brush.y + (Math.random() - .5) * brush.width * .5,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 16,
        life: .35 + Math.random() * .55,
        maxLife: .9,
        size: 1 + Math.random() * 3.5
      });
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= .985;
      p.vy = p.vy * .985 + 14 * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawBackdrop(time) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const glow = ctx.createRadialGradient(SIZE/2, SIZE/2, 40, SIZE/2, SIZE/2, SIZE*.48);
    glow.addColorStop(0, "rgba(36,255,164,.085)");
    glow.addColorStop(.52, "rgba(7,80,55,.04)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(SIZE/2, SIZE/2);
    ctx.rotate(time * .00015);
    const sweep = ctx.createConicGradient(-.14, 0, 0);
    sweep.addColorStop(0, "rgba(95,255,187,0)");
    sweep.addColorStop(.03, "rgba(95,255,187,.065)");
    sweep.addColorStop(.11, "rgba(95,255,187,0)");
    sweep.addColorStop(1, "rgba(95,255,187,0)");
    ctx.fillStyle = sweep;
    ctx.beginPath();
    ctx.arc(0, 0, SIZE*.43, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawPaintedLogo(progress, time) {
    paintedCtx.clearRect(0, 0, SIZE, SIZE);
    const margin = 62;
    paintedCtx.drawImage(logo, margin, margin, SIZE - margin*2, SIZE - margin*2);
    paintedCtx.globalCompositeOperation = "destination-in";
    paintedCtx.drawImage(mask, 0, 0);
    paintedCtx.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.shadowColor = "#54ffb2";
    ctx.shadowBlur = 35 + Math.sin(time * .004) * 5;
    ctx.globalAlpha = .72;
    ctx.drawImage(painted, 0, 0);
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.drawImage(painted, 0, 0);

    if (progress < .995) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = .11;
      ctx.drawImage(painted, 2, 0);
      ctx.globalAlpha = .08;
      ctx.drawImage(painted, -2, 1);
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `rgba(117,255,196,${alpha})`;
      ctx.shadowColor = "#5effb5";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBrush(brush, progress, time) {
    if (progress >= 1 || progress <= 0) return;
    const pulse = 1 + Math.sin(time * .018) * .12;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(brush.x, brush.y);

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, brush.width * .8);
    g.addColorStop(0, "rgba(224,255,241,.95)");
    g.addColorStop(.16, "rgba(102,255,190,.68)");
    g.addColorStop(.5, "rgba(48,255,169,.18)");
    g.addColorStop(1, "rgba(48,255,169,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, brush.width * .8 * pulse, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = "rgba(202,255,231,.9)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#62ffb8";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, brush.width * .22, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  function drawCompletion(progress, time) {
    if (progress < .985) return;
    const t = Math.min(1, (progress - .985) / .015);
    const pulse = .5 + .5 * Math.sin(time * .004);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = t * (.16 + pulse * .06);
    ctx.strokeStyle = "#8affcb";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#63ffb7";
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE * (.425 + pulse * .004), 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  function render(time) {
    drawBackdrop(time);
    drawPaintedLogo(currentProgress, time);
    drawParticles();
    const brush = getBrushState(Math.max(.00001, currentProgress));
    drawBrush(brush, currentProgress, time);
    drawCompletion(currentProgress, time);
  }

  function setProgress(value, rebuild = false) {
    const next = Math.max(0, Math.min(1, value));
    if (rebuild || next < lastPaintedProgress) {
      resetMask();
      paintBetween(0, next);
    } else {
      paintBetween(lastPaintedProgress, next);
    }
    currentProgress = next;
    progressInput.value = Math.round(next * 1000);

    if (next >= 1) {
      playing = false;
      playPause.textContent = "Play";
      status.textContent = "Logo complete";
    } else if (playing) {
      playPause.textContent = "Pause";
      status.textContent = `${Math.round(next * 100)}% painted`;
    } else {
      playPause.textContent = "Play";
      status.textContent = `${Math.round(next * 100)}% painted`;
    }
  }

  function animate(now) {
    const dt = Math.min(.05, (now - lastTime) / 1000);
    lastTime = now;
    shimmerPhase += dt;

    if (playing && currentProgress < 1) {
      const previous = currentProgress;
      const next = Math.min(1, previous + (dt * 1000 * speed) / DURATION);
      setProgress(next);
      const brush = getBrushState(next);
      spawnParticles(brush);
    }

    updateParticles(dt);
    render(now);
    requestAnimationFrame(animate);
  }

  playPause.addEventListener("click", () => {
    if (currentProgress >= 1) setProgress(0, true);
    playing = !playing;
    playPause.textContent = playing ? "Pause" : "Play";
    lastTime = performance.now();
  });

  replay.addEventListener("click", () => {
    particles = [];
    resetMask();
    currentProgress = 0;
    setProgress(0, true);
    playing = true;
    playPause.textContent = "Pause";
    lastTime = performance.now();
  });

  progressInput.addEventListener("input", (event) => {
    playing = false;
    setProgress(Number(event.target.value) / 1000, true);
  });

  speedSelect.addEventListener("change", () => {
    speed = Number(speedSelect.value);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && event.target.tagName !== "BUTTON" && event.target.tagName !== "SELECT") {
      event.preventDefault();
      playPause.click();
    }
  });

  logo.addEventListener("load", () => {
    buildStrokes();
    resetMask();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      playing = false;
      setProgress(1, true);
    } else {
      setProgress(0, true);
    }

    status.textContent = playing ? "Painting…" : "Logo complete";
    requestAnimationFrame(animate);
  });

  logo.src = "data:image/webp;base64," + window.LOGO_B64;
})();
