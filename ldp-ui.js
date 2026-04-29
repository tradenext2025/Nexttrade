// ══════════════════════════════════════════════════════════════════
// LDP UI ENGINE — Circle distribution display
// ══════════════════════════════════════════════════════════════════

const LDPUi = (() => {

  // ── Color map ─────────────────────────────────────────────────
  const COLORS = {
    green:  { stroke: '#00e5a0', glow: '#00e5a040', text: '#00e5a0' },
    yellow: { stroke: '#ffd166', glow: '#ffd16640', text: '#ffd166' },
    red:    { stroke: '#ff3e6c', glow: '#ff3e6c40', text: '#ff3e6c' },
    active: { stroke: '#00b8ff', glow: '#00b8ff40', text: '#00b8ff' },
  };

  // ── Build circle SVG ──────────────────────────────────────────
  function buildCircle(d, isSelected, isHot, isCold) {
    const color     = isSelected ? 'active' : LDPData.getColor(d.pct);
    const c         = COLORS[color];
    const radius    = 36;
    const cx        = 44;
    const cy        = 44;
    const circumference = 2 * Math.PI * radius;
    const progress  = Math.min(d.pct / 20, 1); // max visual = 20%
    const dash      = circumference * progress;
    const gap       = circumference - dash;
    const label     = isHot ? '🔥' : isCold ? '❄️' : '';

    return `
      <div class="ldp-circle-wrap" id="ldp-circle-${d.digit}"
           onclick="LDPUi.selectDigit(${d.digit})"
           style="--glow:${c.glow}">
        <svg viewBox="0 0 88 88" width="88" height="88">
          <!-- Track -->
          <circle
            cx="${cx}" cy="${cy}" r="${radius}"
            fill="none"
            stroke="var(--bg4)"
            stroke-width="7"
          />
          <!-- Progress ring -->
          <circle
            cx="${cx}" cy="${cy}" r="${radius}"
            fill="none"
            stroke="${c.stroke}"
            stroke-width="7"
            stroke-linecap="round"
            stroke-dasharray="${dash} ${gap}"
            stroke-dashoffset="${circumference * 0.25}"
            style="transition:stroke-dasharray 0.5s ease,stroke 0.3s ease;
                   filter:drop-shadow(0 0 4px ${c.glow})"
          />
          <!-- Digit -->
          <text
            x="${cx}" y="${cy - 4}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="${c.text}"
            font-family="Syne,sans-serif"
            font-size="16"
            font-weight="800"
          >${d.digit}</text>
          <!-- Percentage -->
          <text
            x="${cx}" y="${cy + 14}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="${c.text}"
            font-family="DM Mono,monospace"
            font-size="10"
            font-weight="500"
            opacity="0.9"
          >${d.pct.toFixed(1)}%</text>
        </svg>
        ${label ? `<div class="ldp-circle-label">${label}</div>` : ''}
        ${isSelected ? '<div class="ldp-circle-selected-ring"></div>' : ''}
      </div>`;
  }

  // ── Render full grid ──────────────────────────────────────────
  function render(selectedDigit = null) {
    const container = document.getElementById('ldpCircleGrid');
    if (!container) return;

    const dist  = LDPData.getDistribution();
    const sorted = [...dist].sort((a, b) => b.pct - a.pct);
    const hotD  = sorted[0].digit;
    const coldD = sorted[sorted.length - 1].digit;

    container.innerHTML = dist.map(d =>
      buildCircle(
        d,
        d.digit === selectedDigit,
        d.digit === hotD,
        d.digit === coldD
      )
    ).join('');

    // Update sample size
    const sampleEl = document.getElementById('ldpSampleSize');
    if (sampleEl) {
      sampleEl.textContent = `Last ${LDPData.getSampleSize()} / ${LDPData.WINDOW_SIZE} ticks`;
    }

    // Update status badge
    updateStatusBadge();
  }

  // ── Status badge ──────────────────────────────────────────────
  function updateStatusBadge() {
    const el = document.getElementById('ldpStatusBadge');
    if (!el) return;

    if (LDPData.getSampleSize() < 30) {
      el.textContent    = '⏳ Collecting data...';
      el.className      = 'ldp-badge ldp-badge-warn';
    } else if (LDPData.isExtreme()) {
      el.textContent    = '🚫 EXTREME — Trading Blocked';
      el.className      = 'ldp-badge ldp-badge-danger';
    } else if (!LDPData.isStable()) {
      el.textContent    = '⚠️ UNSTABLE — Caution';
      el.className      = 'ldp-badge ldp-badge-warn';
    } else {
      el.textContent    = '✅ STABLE — Safe to Trade';
      el.className      = 'ldp-badge ldp-badge-ok';
    }
  }

  // ── Select digit handler ──────────────────────────────────────
  function selectDigit(d) {
    state.selectedDigit = d;
    render(d);
    updatePayouts();
    // Also sync trade panel digit grid
    updateDigitGrid();
  }

  // ── Animate tick flash on last digit ─────────────────────────
  function flashDigit(digit) {
    const el = document.getElementById(`ldp-circle-${digit}`);
    if (!el) return;
    el.classList.add('ldp-flash');
    setTimeout(() => el.classList.remove('ldp-flash'), 400);
  }

  return { render, selectDigit, flashDigit, updateStatusBadge };
})();
