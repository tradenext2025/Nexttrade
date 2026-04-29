// ══════════════════════════════════════════════════════════════════
// LDP DATA ENGINE — Rolling digit distribution processor
// ══════════════════════════════════════════════════════════════════

const LDPData = (() => {
  const WINDOW_SIZE = 100;
  const history = [];
  const counts = new Array(10).fill(0);

  // ── Push new tick ─────────────────────────────────────────────
  function push(digit) {
    if (digit < 0 || digit > 9) return;
    history.push(digit);
    counts[digit]++;
    if (history.length > WINDOW_SIZE) {
      const removed = history.shift();
      counts[removed]--;
    }
  }

  // ── Get distribution object ───────────────────────────────────
  function getDistribution() {
    const total = history.length || 1;
    return counts.map((c, d) => ({
      digit: d,
      count: c,
      pct: parseFloat(((c / total) * 100).toFixed(2)),
    }));
  }

  // ── Color logic ───────────────────────────────────────────────
  // Green  = 9%–11%   stable
  // Yellow = 7%–9% or 11%–13%   warning
  // Red    = <7% or >13%   extreme
  function getColor(pct) {
    if (pct >= 9 && pct <= 11) return 'green';
    if ((pct >= 7 && pct < 9) || (pct > 11 && pct <= 13)) return 'yellow';
    return 'red';
  }

  // ── Stability check ───────────────────────────────────────────
  // STABLE = ALL digits between 7% and 13%
  function isStable() {
    if (history.length < 30) return false;
    return getDistribution().every(d => d.pct >= 7 && d.pct <= 13);
  }

  // ── Extreme check ─────────────────────────────────────────────
  // EXTREME = ANY digit < 5% or > 15% → block all trading
  function isExtreme() {
    return getDistribution().some(d => d.pct < 5 || d.pct > 15);
  }

  // ── Flat market check ─────────────────────────────────────────
  function isFlatMarket(priceHistory, threshold = 0.05) {
    if (priceHistory.length < 10) return true;
    const recent = priceHistory.slice(-10);
    const range = Math.max(...recent) - Math.min(...recent);
    return range < threshold;
  }

  // ── Get safe trading digits ───────────────────────────────────
  // Middle stable range: 9%–11%
  // Exclude highest and lowest % digits
  function getSafeDigits() {
    const dist = getDistribution();
    const sorted = [...dist].sort((a, b) => b.pct - a.pct);
    const highest = sorted[0].digit;
    const lowest  = sorted[sorted.length - 1].digit;
    return dist
      .filter(d =>
        d.digit !== highest &&
        d.digit !== lowest  &&
        d.pct >= 9 && d.pct <= 11
      )
      .map(d => d.digit);
  }

  // ── Get best digit for Over/Under ────────────────────────────
  function getBestOverUnder() {
    const safe = getSafeDigits();
    if (!safe.length) return null;
    // Pick middle digit (index 5 = over candidate, 4 = under)
    const mid = Math.floor(safe.length / 2);
    return {
      overDigit:  safe[mid] || null,
      underDigit: safe[mid - 1] || safe[mid] || null,
      safeDigits: safe,
    };
  }

  // ── Reset ─────────────────────────────────────────────────────
  function reset() {
    history.length = 0;
    counts.fill(0);
  }

  // ── Get sample size ───────────────────────────────────────────
  function getSampleSize() { return history.length; }

  return {
    push, getDistribution, getColor,
    isStable, isExtreme, isFlatMarket,
    getSafeDigits, getBestOverUnder,
    reset, getSampleSize,
    WINDOW_SIZE,
  };
})();
