const percentStats = new Set(['会心', '会心效果', '破防', '无双']);

export function formatNumber(rawNumber, digits = 0) {
  if (rawNumber === null || rawNumber === undefined || Number.isNaN(Number(rawNumber))) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(rawNumber));
}

export function formatCompact(rawNumber, digits = 2) {
  const number = Number(rawNumber);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 100000000) return `${formatNumber(number / 100000000, digits)} 亿`;
  if (Math.abs(number) >= 10000) return `${formatNumber(number / 10000, digits)} 万`;
  return formatNumber(number, digits);
}

export function formatPercent(rawNumber, digits = 2, signed = false) {
  const number = Number(rawNumber);
  if (!Number.isFinite(number)) return '—';
  const sign = signed && number > 0 ? '+' : '';
  return `${sign}${formatNumber(number * 100, digits)}%`;
}

export function formatStat(label, rawNumber) {
  return percentStats.has(label) ? formatPercent(rawNumber) : formatNumber(rawNumber);
}
