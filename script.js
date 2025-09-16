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

  // Formation definitions
  const formations = {
    "3-3-2": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 17, pos: "LD",  name: "" },
      { xM: 18, yM: 34, pos: "CD",  name: "" },
      { xM: 18, yM: 51, pos: "RD",  name: "" },
      { xM: 34, yM: 20, pos: "LM",  name: "" },
      { xM: 34, yM: 34, pos: "CM",  name: "" },
      { xM: 34, yM: 48, pos: "RM",  name: "" },
      { xM: 50, yM: 26, pos: "STR", name: "" },
      { xM: 50, yM: 42, pos: "STR", name: "" }
    ],
    "3-2-3": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 17, pos: "LD",  name: "" },
      { xM: 18, yM: 34, pos: "CD",  name: "" },
      { xM: 18, yM: 51, pos: "RD",  name: "" },
      { xM: 34, yM: 24, pos: "CM",  name: "" },
      { xM: 34, yM: 44, pos: "CM",  name: "" },
      { xM: 46, yM: 17, pos: "LW",  name: "" },
      { xM: 46, yM: 34, pos: "STR", name: "" },
      { xM: 46, yM: 51, pos: "RW",  name: "" }
    ],
    "2-3-3": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 17, pos: "LD",  name: "" },
      { xM: 18, yM: 51, pos: "RD",  name: "" },
      { xM: 34, yM: 20, pos: "LM",  name: "" },
      { xM: 34, yM: 34, pos: "CM",  name: "" },
      { xM: 34, yM: 48, pos: "RM",  name: "" },
      { xM: 46, yM: 17, pos: "LW",  name: "" },
      { xM: 46, yM: 34, pos: "STR", name: "" },
      { xM: 46, yM: 51, pos: "RW",  name: "" }
    ],
    "4-3-1": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 15, pos: "LD",  name: "" },
      { xM: 18, yM: 28, pos: "CD",  name: "" },
      { xM: 18, yM: 40, pos: "CD",  name: "" },
      { xM: 18, yM: 53, pos: "RD",  name: "" },
      { xM: 34, yM: 20, pos: "LM",  name: "" },
      { xM: 34, yM: 34, pos: "CM",  name: "" },
      { xM: 34, yM: 48, pos: "RM",  name: "" },
      { xM: 50, yM: 34, pos: "STR", name: "" }
    ],
    "3-4-1": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 17, pos: "LD",  name: "" },
      { xM: 18, yM: 34, pos: "CD",  name: "" },
      { xM: 18, yM: 51, pos: "RD",  name: "" },
      { xM: 34, yM: 6, pos: "LM",  name: "" },
      { xM: 34, yM: 24, pos: "CM",  name: "" },
      { xM: 34, yM: 44, pos: "CM",  name: "" },
      { xM: 34, yM: 62, pos: "RM",  name: "" },
      { xM: 46, yM: 34, pos: "STR", name: "" }
    ],
    "2-4-2": [
      { xM: 8,  yM: 34, pos: "GK",  name: "" },
      { xM: 18, yM: 26, pos: "LD",  name: "" },
      { xM: 18, yM: 42, pos: "RD",  name: "" },
      { xM: 34, yM: 6, pos: "LM",  name: "" },
      { xM: 34, yM: 24, pos: "CM",  name: "" },
      { xM: 34, yM: 44, pos: "CM",  name: "" },
      { xM: 34, yM: 62, pos: "RM",  name: "" },
      { xM: 50, yM: 26, pos: "STR", name: "" },
      { xM: 50, yM: 42, pos: "STR", name: "" }
    ]
  };

  // Current formation
  let currentFormation = "3-4-1";

  // Initial player layout (home, white) with labels - start with 3-2-3
  let players = JSON.parse(JSON.stringify(formations[currentFormation]));

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
  let showArea = false;    // toggle for area of responsibility
  let showZones = false;   // toggle for 18-zone grid
  let zoneStates = {};     // zone number -> state: 0=normal, 1=green, 2=red

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
  // If attached, keep track of which player and offset (in meters)
  // { team: 'home'|'away', index: number, offsetXM: number, offsetYM: number } | null
  let ballAttached = null;

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
        assignUniquePlayerName(selectedIndex, val);
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

  function assignUniquePlayerName(playerIdx, newName) {
    // If assigning a non-empty name, clear it from any other player first
    if (newName) {
      for (let i = 0; i < players.length; i++) {
        if (i !== playerIdx && players[i].name === newName) {
          players[i].name = "";
        }
      }
    }
    players[playerIdx].name = newName; // empty string means unassigned
    updateSubsList();
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

    // Align penalty boxes with zone boundaries
    const zoneWidth = w / 6;
    const leftPenaltyRightEdge = x + zoneWidth; // Line between zones 1/4, 7/10, 13/16
    const rightPenaltyLeftEdge = x + 5 * zoneWidth; // Line between zones 3/6, 9/12, 15/18
    
    // Left side areas and spot
    const leftY = center.y - penaltyWidthPx / 2;
    const leftPenaltyWidth = leftPenaltyRightEdge - x;
    ctx.strokeRect(x, leftY, leftPenaltyWidth, penaltyWidthPx);
    const leftGoalY = center.y - goalAreaWidthPx / 2;
    ctx.strokeRect(x, leftGoalY, goalAreaDepthPx, goalAreaWidthPx);
    ctx.beginPath();
    ctx.arc(x + penaltySpotDistPx, center.y, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Right side areas and spot
    const rightPenaltyWidth = (x + w) - rightPenaltyLeftEdge;
    const rightY = center.y - penaltyWidthPx / 2;
    ctx.strokeRect(rightPenaltyLeftEdge, rightY, rightPenaltyWidth, penaltyWidthPx);
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
    
    // Left arc: centered at the left penalty spot, clipped to penalty box boundary
    const leftArcCX = x + penaltySpotDistPx;
    const leftArcCY = center.y;
    const leftArcMaxX = leftPenaltyRightEdge; // Clip to penalty box right edge
    const leftArcTheta = Math.acos(Math.max(-1, Math.min(1, (leftArcMaxX - leftArcCX) / penaltyArcRadiusPx)));
    ctx.beginPath();
    ctx.arc(leftArcCX, leftArcCY, penaltyArcRadiusPx, -leftArcTheta, leftArcTheta);
    ctx.stroke();

    // Right arc: centered at the right penalty spot, clipped to penalty box boundary
    const rightArcCX = x + w - penaltySpotDistPx;
    const rightArcCY = center.y;
    const rightArcMinX = rightPenaltyLeftEdge; // Clip to penalty box left edge
    const rightArcTheta = Math.acos(Math.max(-1, Math.min(1, (rightArcCX - rightArcMinX) / penaltyArcRadiusPx)));
    ctx.beginPath();
    ctx.arc(rightArcCX, rightArcCY, penaltyArcRadiusPx, Math.PI - rightArcTheta, Math.PI + rightArcTheta);
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

  function getUniformNameFontPx() {
    // Use the size that "Knox" would get and apply it to all names
    return computeNameFontSize("Knox");
  }

  function drawPlayers() {
    const uniformNameFont = getUniformNameFontPx();
    // Home team (white) with glossy look and shadow
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const c = mToPx(p.xM, p.yM);
      
      // Use different colors if player is selected and showArea is enabled
      let colors;
      if (showArea && selectedIndex === i) {
        // Selected player gets a color matching their responsibility area
        const areaColor = roleColor(p.pos);
        colors = {
          inner: areaColor,
          mid: adjustBrightness(areaColor, -20),
          outer: adjustBrightness(areaColor, -40),
          ring: "#0e0e0e",
          glossAlpha: 0.65
        };
      } else {
        // Normal white player
        colors = {
          inner: "#ffffff",
          mid: "#e6e6e6",
          outer: "#bdbdbd",
          ring: "#0e0e0e",
          glossAlpha: 0.65
        };
      }
      
      drawShinyMarker(c.x, c.y, playerRadiusPx, colors);
      const fontSize = computeLabelFontSize(p.pos);
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#111111";
      ctx.fillText(p.pos, c.x, c.y);

      if (p.name) {
        ctx.font = `600 ${uniformNameFont}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        // Draw black outline first
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(p.name, c.x, c.y + playerRadiusPx + 4);
        
        // Then draw white text on top
        ctx.fillStyle = "#ffffff";
        ctx.fillText(p.name, c.x, c.y + playerRadiusPx + 4);
      }
    }

    // Away team (orange). Only GK has label.
    for (let i = 0; i < opponents.length; i++) {
      const p = opponents[i];
      const c = mToPx(p.xM, p.yM);
      drawShinyMarker(c.x, c.y, playerRadiusPx, {
        inner: "#ffd180",
        mid: "#ffb74d",
        outer: "#e67e00",
        ring: "#0e0e0e",
        glossAlpha: 0.5
      });
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

  function drawShinyMarker(cx, cy, r, colors) {
    ctx.save();
    // Drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Math.max(6, r * 0.6);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(2, r * 0.2);

    // Radial gradient body
    const grad = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.2,
      cx,
      cy,
      r
    );
    grad.addColorStop(0, colors.inner);
    grad.addColorStop(0.55, colors.mid);
    grad.addColorStop(1, colors.outer);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    // Remove shadow for strokes/overlays
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Outer ring
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.strokeStyle = colors.ring;
    ctx.stroke();

    // Gloss highlight clipped to circle
    ctx.save();
    ctx.clip();
    const glossGrad = ctx.createLinearGradient(cx - r, cy - r, cx, cy);
    glossGrad.addColorStop(0, `rgba(255,255,255,${colors.glossAlpha})`);
    glossGrad.addColorStop(0.7, "rgba(255,255,255,0)");
    ctx.fillStyle = glossGrad;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.35, r * 0.9, -Math.PI * 0.15, Math.PI * 0.7);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function draw() {
    drawField();
    drawZones();
    drawAreaOfResponsibility();
    drawPlayers();
    drawBall();
  }

  function drawZones() {
    if (!showZones) return;
    
    const x = fieldRectPx.x;
    const y = fieldRectPx.y;
    const w = fieldRectPx.w;
    const h = fieldRectPx.h;
    const scale = w / FIELD_LENGTH_M;
    
    // 18-zone grid: 3 rows x 6 columns
    const zoneWidth = w / 6;  // 6 horizontal columns
    const zoneHeight = h / 3; // 3 vertical rows
    
    ctx.save();
    
    // Draw zone grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const zoneX = x + col * zoneWidth;
        const zoneY = y + row * zoneHeight;
        
        // Calculate zone number (1-18, top to bottom, left to right)
        const zoneNumber = col * 3 + row + 1;
        const state = zoneStates[zoneNumber] || 0;
        const greenActive = (state & 1) === 1;
        const redActive = (state & 2) === 2;
        
        // Draw zone background based on state
        if (greenActive) {
          // Bright green highlight
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = "#00e676";
          ctx.fillRect(zoneX, zoneY, zoneWidth, zoneHeight);
        }
        if (redActive) {
          // Red highlight
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#f44336";
          ctx.fillRect(zoneX, zoneY, zoneWidth, zoneHeight);
        }
        
        // Draw zone border
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, 0.08 * scale);
        ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight);
        
        // Draw zone number
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(12, Math.min(24, zoneWidth * 0.15))}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(zoneNumber.toString(), zoneX + zoneWidth / 2, zoneY + zoneHeight / 2);
        
        // Draw cross mark for red state
        if (redActive) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = "#d32f2f";
          ctx.lineWidth = Math.max(2, 0.12 * scale);
          const centerX = zoneX + zoneWidth / 2;
          const centerY = zoneY + zoneHeight / 2;
          const crossSize = Math.min(zoneWidth, zoneHeight) * 0.3;
          ctx.beginPath();
          ctx.moveTo(centerX - crossSize, centerY - crossSize);
          ctx.lineTo(centerX + crossSize, centerY + crossSize);
          ctx.moveTo(centerX + crossSize, centerY - crossSize);
          ctx.lineTo(centerX - crossSize, centerY + crossSize);
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  }

  function drawAreaOfResponsibility() {
    if (!showArea || selectedIndex === -1) return;
    const p = players[selectedIndex];
    if (!p) return;

    const rect = computeResponsibilityRect(p);
    if (!rect) return;

    const x = fieldRectPx.x;
    const y = fieldRectPx.y;
    const w = fieldRectPx.w;
    const h = fieldRectPx.h;
    const scale = w / FIELD_LENGTH_M;

    const pxRect = {
      x: x + rect.xM * scale,
      y: y + rect.yM * scale,
      w: rect.wM * scale,
      h: rect.hM * scale
    };

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = roleColor(p.pos);
    ctx.fillRect(pxRect.x, pxRect.y, pxRect.w, pxRect.h);
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(1, 0.12 * scale);
    ctx.strokeStyle = roleColor(p.pos);
    ctx.strokeRect(pxRect.x, pxRect.y, pxRect.w, pxRect.h);
    ctx.restore();
  }

  function roleColor(pos) {
    switch (pos) {
      case 'GK': return '#00bcd4';
      case 'LD': return '#2196f3';
      case 'CD': return '#8bc34a';
      case 'RD': return '#2196f3';
      case 'LM': return '#ff7043';
      case 'CM': return '#ffc107';
      case 'RM': return '#ff7043';
      case 'STR': return '#e91e63';
      default: return '#9e9e9e';
    }
  }

  function adjustBrightness(hex, percent) {
    // Remove the hash if present
    hex = hex.replace('#', '');
    
    // Parse the hex color
    const num = parseInt(hex, 16);
    const amt = Math.round(2.55 * percent);
    
    // Extract RGB components
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    // Clamp values to 0-255
    const clamp = (val) => Math.max(0, Math.min(255, val));
    
    // Convert back to hex
    return '#' + (0x1000000 + clamp(R) * 0x10000 + clamp(G) * 0x100 + clamp(B)).toString(16).slice(1);
  }

  // Returns rectangle in meters within field coords: { xM, yM, wM, hM }
  function computeResponsibilityRect(player) {
    const pos = player.pos;
    // Field: xM ∈ [0,105], yM ∈ [0,68], left is our goal; we play left→right
    // Helper constants
    const halfX = FIELD_LENGTH_M / 2; // 52.5
    const bitBeyond = 8;              // a little into opp half
    const sideBit = 6;                // a little into opposite side area
    const penaltyDepth = 16.5;
    const goalAreaDepth = 5.5;
    const wingMargin = 15;           // keep central roles away from touchlines ~ where LM/RM operate

    switch (pos) {
      case 'GK': {
        // Mostly in penalty box, can sweep up to center of own half
        const xM = 0;
        const wM = halfX; // own half
        // Y: slightly narrower than full width to imply centrality
        return { xM, yM: (68 - 40) / 2, wM, hM: 40 };
      }
      case 'LD': {
        // Left side up to halfway and a bit beyond
        return { xM: 0, yM: 0, wM: halfX + bitBeyond, hM: 68 / 2 };
      }
      case 'CD': {
        // Central vertical band (avoid wings), up to halfway and a bit beyond
        return { xM: 0, yM: wingMargin, wM: halfX + bitBeyond, hM: 68 - 2 * wingMargin };
      }
      case 'RD': {
        // Right side up to halfway and a bit beyond
        return { xM: 0, yM: 68 / 2, wM: halfX + bitBeyond, hM: 68 / 2 };
      }
      case 'LM': {
        // Left side; extend depth same as CM (to opponent's goal area line)
        const xM = penaltyDepth / 2;
        const xMax = FIELD_LENGTH_M;
        return { xM, yM: 0, wM: xMax - xM, hM: 68 / 2 };
      }
      case 'CM': {
        // Left CM: from a bit beyond LM to a bit beyond the right CM
        // Right CM: from a bit beyond the left CM to a bit beyond RM
        const xM = penaltyDepth / 2;
        const xMax = FIELD_LENGTH_M; // extend to opponent end line as with LM/RM/STR
        let lmY = null, rmY = null;
        const cmIndices = [];
        for (let i = 0; i < players.length; i++) {
          const posi = players[i].pos;
          if (posi === 'LM') lmY = players[i].yM;
          if (posi === 'RM') rmY = players[i].yM;
          if (posi === 'CM') cmIndices.push(i);
        }
        if (cmIndices.length < 2 || lmY == null || rmY == null) {
          // Fallback static band if roles not found
          const yTop = 6, yBottom = 62;
          return { xM, yM: yTop, wM: xMax - xM, hM: yBottom - yTop };
        }
        const cmA = players[cmIndices[0]];
        const cmB = players[cmIndices[1]];
        const upperCM = cmA.yM <= cmB.yM ? cmA : cmB;
        const lowerCM = cmA.yM > cmB.yM ? cmA : cmB;
        const pad = 2;
        if (player === upperCM) {
          const yTop = Math.max(0, (lmY != null ? lmY : 0) - pad);
          const yBottom = Math.min(68, lowerCM.yM + pad);
          return { xM, yM: yTop, wM: xMax - xM, hM: yBottom - yTop };
        } else if (player === lowerCM) {
          const yTop = Math.max(0, upperCM.yM - pad);
          const yBottom = Math.min(68, (rmY != null ? rmY : 68) + pad);
          return { xM, yM: yTop, wM: xMax - xM, hM: yBottom - yTop };
        } else {
          const yTop = 6, yBottom = 62;
          return { xM, yM: yTop, wM: xMax - xM, hM: yBottom - yTop };
        }
      }
      case 'RM': {
        // Right side; extend depth same as CM (to opponent's goal area line)
        const xM = penaltyDepth / 2;
        const xMax = FIELD_LENGTH_M;
        return { xM, yM: 68 / 2, wM: xMax - xM, hM: 68 / 2 };
      }
      case 'STR': {
        // Middle from halfway in own half to other goal line
        const quarter = FIELD_LENGTH_M / 4; // ~26.25
        return { xM: halfX - quarter, yM: 68 / 4, wM: halfX + quarter, hM: 68 / 2 };
      }
      default:
        return null;
    }
  }

  function drawBall() {
    const c = mToPx(ball.xM, ball.yM);
    const r = ballRadiusPx;
    const size = r * 2;
    if (ballImgLoaded) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = Math.max(6, r * 0.6);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(2, r * 0.2);
      ctx.drawImage(ballImg, c.x - r, c.y - r, size, size);
      ctx.restore();
    } else {
      drawFallbackBall(c.x, c.y, r);
    }
  }

  // Fallback canvas-rendered ball if SVG fails to load
  function drawFallbackBall(cx, cy, r) {
    ctx.save();
    // Drop shadow under the ball
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Math.max(6, r * 0.6);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(2, r * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    // Now paint the glossy ball contents clipped to the circle
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
    const uniformNameFont = getUniformNameFontPx();
    const nameHeight = uniformNameFont * 1.1; // include top leading
    for (let i = players.length - 1; i >= 0; i--) {
      const p = players[i];
      const c = mToPx(p.xM, p.yM);
      const dx = xPx - c.x;
      const dy = yPx - c.y;
      const withinCircle = dx * dx + dy * dy <= playerRadiusPx * playerRadiusPx;
      if (withinCircle) return i;
      if (p.name) {
        // Expand hit area to rectangle covering name below the circle
        const nameTop = c.y + playerRadiusPx + 2;
        const nameBottom = nameTop + nameHeight;
        const nameHalfWidth = playerRadiusPx * 1.2; // generous width
        if (xPx >= c.x - nameHalfWidth && xPx <= c.x + nameHalfWidth && yPx >= nameTop && yPx <= nameBottom) {
          return i;
        }
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

  function hitTestZone(xPx, yPx) {
    if (!showZones) return -1;
    
    const x = fieldRectPx.x;
    const y = fieldRectPx.y;
    const w = fieldRectPx.w;
    const h = fieldRectPx.h;
    
    // Check if click is within field bounds
    if (xPx < x || xPx > x + w || yPx < y || yPx > y + h) return -1;
    
    const zoneWidth = w / 6;  // 6 horizontal columns
    const zoneHeight = h / 3; // 3 vertical rows
    
    const col = Math.floor((xPx - x) / zoneWidth);
    const row = Math.floor((yPx - y) / zoneHeight);
    
    // Calculate zone number (1-18, top to bottom, left to right)
    const zoneNumber = col * 3 + row + 1;
    
    return zoneNumber;
  }

  function findBallAttachCandidate() {
    // Returns { team: 'home'|'away', index } if the ball is touching a player
    // Use pixel space to compare radii
    const ballPx = mToPx(ball.xM, ball.yM);
    const threshold = (playerRadiusPx + ballRadiusPx);
    const thresholdSq = threshold * threshold;

    // Check home first (either order is fine)
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const pp = mToPx(p.xM, p.yM);
      const dx = ballPx.x - pp.x;
      const dy = ballPx.y - pp.y;
      if (dx * dx + dy * dy <= thresholdSq) {
        return { team: 'home', index: i };
      }
    }
    // Then away
    for (let i = 0; i < opponents.length; i++) {
      const p = opponents[i];
      const pp = mToPx(p.xM, p.yM);
      const dx = ballPx.x - pp.x;
      const dy = ballPx.y - pp.y;
      if (dx * dx + dy * dy <= thresholdSq) {
        return { team: 'away', index: i };
      }
    }
    return null;
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
      // Detach on direct ball control
      ballAttached = null;
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
      // Immediately reflect selection state (for area highlight)
      draw();
      return;
    }
    // Check for zone clicks if zones are visible
    if (showZones) {
      const zoneNumber = hitTestZone(pt.x, pt.y);
      if (zoneNumber !== -1) {
        // Left click: toggle green state
        const currentState = zoneStates[zoneNumber] || 0;
        const greenActive = (currentState & 1) === 1;
        const redActive = (currentState & 2) === 2;
        
        if (e.button === 0) { // Left click
          if (e.ctrlKey) {
            // Ctrl+Left click: toggle red (bit 1)
            zoneStates[zoneNumber] = redActive ? (currentState & ~2) : (currentState | 2);
          } else {
            // Normal left click: if zone has any selection, clear it; otherwise toggle green
            if (currentState > 0) {
              // Clear all selections
              zoneStates[zoneNumber] = 0;
            } else {
              // Toggle green (bit 0)
              zoneStates[zoneNumber] = currentState | 1;
            }
          }
        }
        draw();
        return;
      }
    }
    // Clicked elsewhere: hide any open picker and deselect player if showArea is enabled
    hideNamePicker();
    if (showArea && selectedIndex !== -1) {
      selectedIndex = -1;
      draw();
    }
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
        if (ballAttached && ballAttached.team === 'home' && ballAttached.index === draggingIndex) {
          ball.xM = players[draggingIndex].xM + ballAttached.offsetXM;
          ball.yM = players[draggingIndex].yM + ballAttached.offsetYM;
        }
      } else if (draggingTeam === 'away') {
        opponents[draggingIndex].xM = m.xM;
        opponents[draggingIndex].yM = m.yM;
        if (ballAttached && ballAttached.team === 'away' && ballAttached.index === draggingIndex) {
          ball.xM = opponents[draggingIndex].xM + ballAttached.offsetXM;
          ball.yM = opponents[draggingIndex].yM + ballAttached.offsetYM;
        }
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
      // On ball release, see if we should attach to a player
      const attachTo = findBallAttachCandidate();
      if (attachTo) {
        if (attachTo.team === 'home') {
          const p = players[attachTo.index];
          ballAttached = {
            team: 'home',
            index: attachTo.index,
            offsetXM: ball.xM - p.xM,
            offsetYM: ball.yM - p.yM
          };
        } else {
          const p = opponents[attachTo.index];
          ballAttached = {
            team: 'away',
            index: attachTo.index,
            offsetXM: ball.xM - p.xM,
            offsetYM: ball.yM - p.yM
          };
        }
      }
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
      draw();
    }
  });

  // Close the picker when clicking anywhere outside of it
  document.addEventListener('pointerdown', (e) => {
    if (!namePickerDiv) return;
    if (namePickerDiv.style.display === 'block' && !namePickerDiv.contains(e.target)) {
      hideNamePicker();
    }
  });

  // Formation change functionality
  function changeFormation(formation) {
    if (formations[formation]) {
      currentFormation = formation;
      
      // Update players with new formation (clear all names)
      players = JSON.parse(JSON.stringify(formations[formation]));
      
      // Update button text and active state
      const formationBtn = document.getElementById('formation-btn');
      formationBtn.textContent = `Formation: ${formation}`;
      
      // Update active state in dropdown
      document.querySelectorAll('.formation-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.formation === formation) {
          option.classList.add('active');
        }
      });
      
      updateSubsList();
      // If ball was attached to a home player, re-position with the new player location
      if (ballAttached && ballAttached.team === 'home') {
        const p = players[ballAttached.index];
        if (p) {
          ball.xM = p.xM + ballAttached.offsetXM;
          ball.yM = p.yM + ballAttached.offsetYM;
        } else {
          // Index no longer valid; detach
          ballAttached = null;
        }
      }
      draw();
    }
  }

  // Update subs list with unassigned players
  function updateSubsList() {
    const subsList = document.getElementById('subs-list');
    if (!subsList) return;
    
    // Get all assigned player names
    const assignedNames = new Set();
    players.forEach(player => {
      if (player.name) {
        assignedNames.add(player.name);
      }
    });
    
    // Find unassigned players
    const unassignedPlayers = roster.filter(name => !assignedNames.has(name));
    
    // Clear and rebuild the subs list
    subsList.innerHTML = '';
    
    if (unassignedPlayers.length === 0) {
      const noSubs = document.createElement('div');
      noSubs.className = 'no-subs';
      noSubs.textContent = 'No subs available';
      subsList.appendChild(noSubs);
    } else {
      unassignedPlayers.forEach(name => {
        const subPlayer = document.createElement('div');
        subPlayer.className = 'sub-player';
        subPlayer.textContent = name;
        subsList.appendChild(subPlayer);
      });
    }
    
    // Position the toggle button beneath the subs section
    positionToggleButton();
  }
  
  // Position the toggle button on the right side (no longer needed with CSS positioning)
  function positionToggleButton() {
    // Button is now positioned with CSS on the right side
    // This function is kept for compatibility but does nothing
  }

  window.addEventListener("resize", () => { hideNamePicker(); resizeAndDraw(); positionToggleButton(); });
  window.addEventListener("DOMContentLoaded", () => { 
    console.log("DOM Content Loaded - Initializing formation controls");
    
    // Formation button event handlers
    const formationBtn = document.getElementById('formation-btn');
    const formationDropdown = document.getElementById('formation-dropdown');
    
    if (!formationBtn) {
      console.error("Formation button not found!");
      return;
    }
    
    if (!formationDropdown) {
      console.error("Formation dropdown not found!");
      return;
    }
    
    console.log("Formation controls found, setting up event handlers");
    
    // Toggle dropdown on button click
    formationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      formationDropdown.classList.toggle('show');
    });
    
    // Handle formation selection
    document.querySelectorAll('.formation-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const formation = option.dataset.formation;
        changeFormation(formation);
        formationDropdown.classList.remove('show');
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!formationBtn.contains(e.target) && !formationDropdown.contains(e.target)) {
        formationDropdown.classList.remove('show');
      }
    });
    // Toggle area of responsibility
    const areaToggle = document.getElementById('show-area-toggle');
    if (areaToggle) {
      areaToggle.addEventListener('change', () => {
        showArea = areaToggle.checked;
        draw();
      });
    }
    
    // Toggle zones
    const zonesToggle = document.getElementById('show-zones-toggle');
    if (zonesToggle) {
      zonesToggle.addEventListener('change', () => {
        showZones = zonesToggle.checked;
        draw();
      });
    }
    
         // Set initial active state
     changeFormation(currentFormation);
     
     // Initialize the field
     resizeAndDraw();
     
     // Initialize subs list
     updateSubsList();
     
     // Position toggle button after initial layout
     setTimeout(positionToggleButton, 100);
  });
})();


