(() => {
  "use strict";

  const FIELD_LENGTH_M = 105; // touchline-to-touchline (x-axis)
  const FIELD_WIDTH_M = 68;   // goal-to-goal (y-axis)

  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  // Floating name picker elements (created dynamically)
  let namePickerDiv = null; // HTMLDivElement | null
  let namePickerSelect = null; // HTMLSelectElement | null

  let fieldRectPx = { x: 0, y: 0, w: 0, h: 0 };
  let playerRadiusPx = 12;

  // Initial player layout (home, white) with labels
  const players = [
    // 3-2-3 on left half
    { xM: 8,  yM: 34, pos: "GK",  name: "" },
    { xM: 18, yM: 17, pos: "LD",  name: "" },
    { xM: 18, yM: 34, pos: "CD",  name: "" },
    { xM: 18, yM: 51, pos: "RD",  name: "" },
    { xM: 34, yM: 24, pos: "CM",  name: "" },
    { xM: 34, yM: 44, pos: "CM",  name: "" },
    { xM: 46, yM: 17, pos: "LW",  name: "" },
    { xM: 46, yM: 34, pos: "STR", name: "" },
    { xM: 46, yM: 51, pos: "RW",  name: "" }
  ];

  // Away team (orange). Only GK is labeled, others blank.
  const opponents = [
    // 3-3-2 on right half
    { xM: 97, yM: 34, label: "GK" },
    { xM: 87, yM: 17, label: "" },
    { xM: 87, yM: 34, label: "" },
    { xM: 87, yM: 51, label: "" },
    { xM: 71, yM: 20, label: "" },
    { xM: 71, yM: 34, label: "" },
    { xM: 71, yM: 48, label: "" },
    { xM: 60, yM: 26, label: "" },
    { xM: 60, yM: 42, label: "" }
  ];

  let draggingIndex = -1;
  let draggingTeam = null; // 'home' | 'away' | null
  let hoverIndex = -1;
  let hoverTeam = null;    // 'home' | 'away' | null
  let draggingBall = false;
  let hoverBall = false;
  let selectedIndex = -1;  // selected home player index for naming

  // Long-press detection for inline name picker
  const LONG_PRESS_MS = 600;
  const MOVE_THRESHOLD_PX = 6;
  let longPressTimer = null;
  let longPressFired = false;
  let pendingIndex = -1; // candidate home player for drag/long-press
  let pendingTeam = null;
  let downPt = { x: 0, y: 0 };

  // Ball state (in meters, same coordinate system as players)
  // Ball at exact kickoff spot (center)
  const ball = { xM: FIELD_LENGTH_M / 2, yM: FIELD_WIDTH_M / 2 };
  let ballRadiusPx = 8;

  // External SVG for realistic ball
  const BALL_SVG_URL = "https://upload.wikimedia.org/wikipedia/commons/e/ec/Soccer_ball.svg";
  let ballImg = new Image();
  let ballImgLoaded = false;
  ballImg.crossOrigin = "anonymous";
  ballImg.onload = () => { ballImgLoaded = true; draw(); };
  ballImg.onerror = () => { ballImgLoaded = false; };
  ballImg.src = BALL_SVG_URL;

  function resizeAndDraw() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    computeFieldRect();
    draw();
  }

  // Roster and UI setup
  const roster = [
    "Alex","Charlie","Connery","Elijah","Hayden","Kabir","Knox",
    "Levi","Linus","Oliver","Rocket","Sakima","Sebastian"
  ];
  function ensureNamePicker() {
    if (namePickerDiv) return;
    namePickerDiv = document.createElement('div');
    namePickerDiv.className = 'name-picker';
    namePickerSelect = document.createElement('select');
    const optUnassigned = document.createElement('option');
    optUnassigned.value = '';
    optUnassigned.textContent = 'Unassigned';
    namePickerSelect.appendChild(optUnassigned);
    for (const n of roster) {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      namePickerSelect.appendChild(opt);
    }
    namePickerDiv.appendChild(namePickerSelect);
    document.body.appendChild(namePickerDiv);
    namePickerSelect.onchange = () => {
      if (selectedIndex !== -1) {
        const val = namePickerSelect.value.trim();
        players[selectedIndex].name = val;
        hideNamePicker();
        draw();
      }
    };
  }

  function showNamePickerAt(px, py, currentName) {
    ensureNamePicker();
    if (!namePickerDiv || !namePickerSelect) return;
    namePickerSelect.value = currentName || '';
    namePickerDiv.style.left = `${Math.round(px)}px`;
    namePickerDiv.style.top = `${Math.round(py)}px`;
    namePickerDiv.style.display = 'block';
    namePickerSelect.focus();
  }

  function hideNamePicker() {
    if (namePickerDiv) namePickerDiv.style.display = 'none';
  }

  function computeFieldRect() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const ratio = FIELD_LENGTH_M / FIELD_WIDTH_M;
    const margin = Math.min(cw, ch) * 0.05;
    const availW = cw - margin * 2;
    const availH = ch - margin * 2;

    let fieldW, fieldH;
    if (availW / availH > ratio) {
      fieldH = availH;
      fieldW = fieldH * ratio;
    } else {
      fieldW = availW;
      fieldH = fieldW / ratio;
    }

    fieldRectPx.w = fieldW;
    fieldRectPx.h = fieldH;
    fieldRectPx.x = (cw - fieldW) / 2;
    fieldRectPx.y = (ch - fieldH) / 2;

    // Player marker size scales with field width
    playerRadiusPx = Math.max(10, Math.min(26, fieldRectPx.w * 0.018));

    // Ball scales smaller than a player marker
    ballRadiusPx = Math.max(6, Math.min(14, fieldRectPx.w * 0.010));
  }

  function mToPx(xM, yM) {
    const scale = fieldRectPx.w / FIELD_LENGTH_M;
    return {
      x: fieldRectPx.x + xM * scale,
      y: fieldRectPx.y + yM * scale
    };
  }

  function pxToM(xPx, yPx) {
    const scale = fieldRectPx.w / FIELD_LENGTH_M;
    return {
      xM: (xPx - fieldRectPx.x) / scale,
      yM: (yPx - fieldRectPx.y) / scale
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function drawField() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    ctx.clearRect(0, 0, cw, ch);

    const x = fieldRectPx.x;
    const y = fieldRectPx.y;
    const w = fieldRectPx.w;
    const h = fieldRectPx.h;
    const scale = w / FIELD_LENGTH_M;

    const lineWidth = Math.max(1, 0.12 * scale);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    // Outer boundary
    ctx.strokeRect(x, y, w, h);

    // Halfway line
    const midX = x + w / 2;
    ctx.beginPath();
    ctx.moveTo(midX, y);
    ctx.lineTo(midX, y + h);
    ctx.stroke();

    // Center circle and spot
    const center = mToPx(FIELD_LENGTH_M / 2, FIELD_WIDTH_M / 2);
    const centerRadiusPx = 9.15 * scale; // 9.15m radius
    ctx.beginPath();
    ctx.arc(center.x, center.y, centerRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
    const spotRadius = Math.max(1.5, lineWidth / 2);
    ctx.beginPath();
    ctx.arc(center.x, center.y, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Penalty and goal areas
    const penaltyDepthPx = 16.5 * scale;
    const penaltyWidthPx = 40.32 * scale;
    const goalAreaDepthPx = 5.5 * scale;
    const goalAreaWidthPx = 18.32 * scale;
    const penaltySpotDistPx = 11 * scale; // distance of spot from goal line

    // Left side areas and spot
    const leftY = center.y - penaltyWidthPx / 2;
    ctx.strokeRect(x, leftY, penaltyDepthPx, penaltyWidthPx);
    const leftGoalY = center.y - goalAreaWidthPx / 2;
    ctx.strokeRect(x, leftGoalY, goalAreaDepthPx, goalAreaWidthPx);
    ctx.beginPath();
    ctx.arc(x + penaltySpotDistPx, center.y, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right side areas and spot
    const rightX = x + w - penaltyDepthPx;
    const rightY = center.y - penaltyWidthPx / 2;
    ctx.strokeRect(rightX, rightY, penaltyDepthPx, penaltyWidthPx);
    const rightGoalX = x + w - goalAreaDepthPx;
    const rightGoalY = center.y - goalAreaWidthPx / 2;
    ctx.strokeRect(rightGoalX, rightGoalY, goalAreaDepthPx, goalAreaWidthPx);
    ctx.beginPath();
    ctx.arc(x + w - penaltySpotDistPx, center.y, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Corner arcs (1m radius)
    const cornerRadius = 1 * scale;
    ctx.beginPath();
    ctx.arc(x, y, cornerRadius, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + h, cornerRadius, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w, y, cornerRadius, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w, y + h, cornerRadius, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Penalty arcs (the "D" at top of each penalty box)
    const penaltyArcRadiusPx = 9.15 * scale; // radius from penalty spot
    const delta = (penaltyDepthPx - penaltySpotDistPx) / penaltyArcRadiusPx;
    const clamped = Math.max(-1, Math.min(1, delta));
    const theta = Math.acos(clamped);

    // Left arc: centered at the left penalty spot, arc facing toward midfield (to the right)
    const leftArcCX = x + penaltySpotDistPx;
    const leftArcCY = center.y;
    ctx.beginPath();
    ctx.arc(leftArcCX, leftArcCY, penaltyArcRadiusPx, -theta, theta);
    ctx.stroke();

    // Right arc: centered at the right penalty spot, arc facing toward midfield (to the left)
    const rightArcCX = x + w - penaltySpotDistPx;
    const rightArcCY = center.y;
    ctx.beginPath();
    ctx.arc(rightArcCX, rightArcCY, penaltyArcRadiusPx, Math.PI - theta, Math.PI + theta);
    ctx.stroke();
  }

  function computeLabelFontSize(label) {
    // Try to fit label inside the circle, shrinking if necessary
    let fontSize = Math.round(playerRadiusPx * 0.95);
    const maxWidth = playerRadiusPx * 1.6;
    do {
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      const width = ctx.measureText(label).width;
      if (width <= maxWidth || fontSize <= 9) break;
      fontSize -= 1;
    } while (true);
    return fontSize;
  }

  function computeNameFontSize(name) {
    let fontSize = Math.round(playerRadiusPx * 0.8);
    const maxWidth = playerRadiusPx * 2.4;
    do {
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      const width = ctx.measureText(name).width;
      if (width <= maxWidth || fontSize <= 9) break;
      fontSize -= 1;
    } while (true);
    return fontSize;
  }

  function drawPlayers() {
    // Home team (white)
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const c = mToPx(p.xM, p.yM);
      ctx.beginPath();
      ctx.arc(c.x, c.y, playerRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = Math.max(1, playerRadiusPx * 0.18);
      ctx.strokeStyle = "#111111";
      ctx.stroke();
      const fontSize = computeLabelFontSize(p.pos);
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#111111";
      ctx.fillText(p.pos, c.x, c.y);

      if (p.name) {
        const nameSize = computeNameFontSize(p.name);
        ctx.font = `600 ${nameSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffffff";
        // subtle text shadow for readability
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillText(p.name, c.x, c.y + playerRadiusPx + 4);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
    }

    // Away team (orange). Only GK has label.
    for (let i = 0; i < opponents.length; i++) {
      const p = opponents[i];
      const c = mToPx(p.xM, p.yM);
      ctx.beginPath();
      ctx.arc(c.x, c.y, playerRadiusPx, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9800"; // material orange 500
      ctx.fill();
      ctx.lineWidth = Math.max(1, playerRadiusPx * 0.18);
      ctx.strokeStyle = "#111111";
      ctx.stroke();
      if (p.label) {
        const fontSize = computeLabelFontSize(p.label);
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#111111";
        ctx.fillText(p.label, c.x, c.y);
      }
    }
  }

  function draw() {
    drawField();
    drawPlayers();
    drawBall();
  }

  function drawBall() {
    const c = mToPx(ball.xM, ball.yM);
    const r = ballRadiusPx;
    const size = r * 2;
    if (ballImgLoaded) {
      ctx.drawImage(ballImg, c.x - r, c.y - r, size, size);
    } else {
      drawFallbackBall(c.x, c.y, r);
    }
  }

  // Fallback canvas-rendered ball if SVG fails to load
  function drawFallbackBall(cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.6, "#f2f2f2");
    grad.addColorStop(1, "#d0d0d0");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    const seamColor = "#222222";
    const seamWidth = Math.max(1, r * 0.06);
    const centerPentagonRadius = r * 0.46;
    ctx.fillStyle = "#111111";
    pathRegularPolygon(cx, cy, centerPentagonRadius, 5, -Math.PI / 2);
    ctx.fill();
    ctx.lineWidth = seamWidth;
    ctx.strokeStyle = seamColor;
    ctx.stroke();
    const ring1Radius = r * 0.78;
    const hexRadius = r * 0.28;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const px = cx + ring1Radius * Math.cos(a);
      const py = cy + ring1Radius * Math.sin(a);
      ctx.fillStyle = "#ffffff";
      pathRegularPolygon(px, py, hexRadius, 6, a + Math.PI / 6);
      ctx.fill();
      ctx.lineWidth = seamWidth;
      ctx.strokeStyle = seamColor;
      ctx.stroke();
    }
    const ring2Radius = r * 0.94;
    const pentagonRadius = r * 0.22;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + Math.PI / 5;
      const px = cx + ring2Radius * Math.cos(a);
      const py = cy + ring2Radius * Math.sin(a);
      ctx.fillStyle = "#111111";
      pathRegularPolygon(px, py, pentagonRadius, 5, a + Math.PI / 2);
      ctx.fill();
      ctx.lineWidth = seamWidth;
      ctx.strokeStyle = seamColor;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.strokeStyle = "#111111";
    ctx.stroke();
  }

  function pathRegularPolygon(cx, cy, radius, sides, rotationRad) {
    const step = (2 * Math.PI) / sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotationRad + i * step;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function computeRegularPolygonVertices(cx, cy, radius, sides, rotationRad) {
    const verts = [];
    const step = (2 * Math.PI) / sides;
    for (let i = 0; i < sides; i++) {
      const a = rotationRad + i * step;
      verts.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
    }
    return verts;
  }

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hitTestPlayers(xPx, yPx) {
    for (let i = players.length - 1; i >= 0; i--) {
      const c = mToPx(players[i].xM, players[i].yM);
      const dx = xPx - c.x;
      const dy = yPx - c.y;
      if (dx * dx + dy * dy <= playerRadiusPx * playerRadiusPx) {
        return i;
      }
    }
    return -1;
  }

  function hitTestOpponents(xPx, yPx) {
    for (let i = opponents.length - 1; i >= 0; i--) {
      const c = mToPx(opponents[i].xM, opponents[i].yM);
      const dx = xPx - c.x;
      const dy = yPx - c.y;
      if (dx * dx + dy * dy <= playerRadiusPx * playerRadiusPx) {
        return i;
      }
    }
    return -1;
  }
  function hitTestBall(xPx, yPx) {
    const c = mToPx(ball.xM, ball.yM);
    const dx = xPx - c.x;
    const dy = yPx - c.y;
    return dx * dx + dy * dy <= ballRadiusPx * ballRadiusPx;
  }

  function updateCursor() {
    if (draggingIndex !== -1 || draggingBall) {
      canvas.style.cursor = "grabbing";
    } else if (hoverIndex !== -1 || hoverBall) {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "default";
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return; // left button only
    const pt = getPointerPos(e);
    // Prioritize ball if both overlap
    if (hitTestBall(pt.x, pt.y)) {
      draggingBall = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      updateCursor();
      return;
    }
    // Next check away team (drawn after home, so visually on top)
    let idx = hitTestOpponents(pt.x, pt.y);
    if (idx !== -1) {
      draggingIndex = idx;
      draggingTeam = 'away';
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      updateCursor();
      return;
    }
    // Finally check home team
    idx = hitTestPlayers(pt.x, pt.y);
    if (idx !== -1) {
      // Defer starting drag to allow long-press
      pendingIndex = idx;
      pendingTeam = 'home';
      selectedIndex = idx;
      downPt = pt;
      longPressFired = false;
      if (longPressTimer) { clearTimeout(longPressTimer); }
      longPressTimer = setTimeout(() => {
        // If not started dragging and still pending on the same player, show picker
        if (draggingIndex === -1 && !draggingBall && pendingTeam === 'home' && pendingIndex === idx) {
          const c = mToPx(players[idx].xM, players[idx].yM);
          showNamePickerAt(c.x, c.y + playerRadiusPx + 10, players[idx].name);
          longPressFired = true;
        }
      }, LONG_PRESS_MS);
      updateCursor();
      return;
    }
    // Clicked elsewhere: hide any open picker
    hideNamePicker();
  });

  canvas.addEventListener("pointermove", (e) => {
    const pt = getPointerPos(e);
    if (draggingBall) {
      const m = pxToM(pt.x, pt.y);
      ball.xM = m.xM;
      ball.yM = m.yM;
      draw();
    } else if (draggingIndex !== -1) {
      const m = pxToM(pt.x, pt.y);
      if (draggingTeam === 'home') {
        players[draggingIndex].xM = m.xM;
        players[draggingIndex].yM = m.yM;
      } else if (draggingTeam === 'away') {
        opponents[draggingIndex].xM = m.xM;
        opponents[draggingIndex].yM = m.yM;
      }
      draw();
    } else {
      // If we have a pending home player and movement exceeds threshold, start dragging
      if (pendingTeam === 'home' && pendingIndex !== -1) {
        const dx = pt.x - downPt.x;
        const dy = pt.y - downPt.y;
        if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
          draggingIndex = pendingIndex;
          draggingTeam = 'home';
          pendingIndex = -1; pendingTeam = null;
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
          updateCursor();
          return;
        }
      }
      hoverBall = hitTestBall(pt.x, pt.y);
      if (hoverBall) {
        hoverIndex = -1;
        hoverTeam = null;
      } else {
        // Check topmost first: away, then home
        const awayIdx = hitTestOpponents(pt.x, pt.y);
        if (awayIdx !== -1) {
          hoverIndex = awayIdx;
          hoverTeam = 'away';
        } else {
          const homeIdx = hitTestPlayers(pt.x, pt.y);
          hoverIndex = homeIdx;
          hoverTeam = homeIdx !== -1 ? 'home' : null;
        }
      }
      updateCursor();
    }
  });

  function endDrag(e) {
    if (draggingBall) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      draggingBall = false;
      updateCursor();
    } else if (draggingIndex !== -1) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      draggingIndex = -1;
      draggingTeam = null;
      updateCursor();
    }
    // Cancel any pending long-press if mouse/touch released
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    pendingIndex = -1; pendingTeam = null; longPressFired = false;
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Name picker on double-click of a white player
  canvas.addEventListener('dblclick', (e) => {
    const pt = getPointerPos(e);
    const idx = hitTestPlayers(pt.x, pt.y);
    if (idx !== -1) {
      selectedIndex = idx;
      const c = mToPx(players[idx].xM, players[idx].yM);
      showNamePickerAt(c.x, c.y + playerRadiusPx + 10, players[idx].name);
    }
  });

  // Close the picker when clicking anywhere outside of it
  document.addEventListener('pointerdown', (e) => {
    if (!namePickerDiv) return;
    if (namePickerDiv.style.display === 'block' && !namePickerDiv.contains(e.target)) {
      hideNamePicker();
    }
  });

  window.addEventListener("resize", () => { hideNamePicker(); resizeAndDraw(); });
  window.addEventListener("DOMContentLoaded", () => { resizeAndDraw(); });
})();


