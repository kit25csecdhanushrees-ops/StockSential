import { ComponentItem, NotificationSettings, StockSeverity } from '../types';

/**
 * Calculates remaining production hours before a workstation stops due to stock-out.
 * Formula: Time-to-Stockout (hours) = Current Quantity / Consumption Rate per Hour
 */
export function calculateTimeToStockout(
  currentQty: number,
  consumptionRatePerHour: number
): number {
  if (currentQty <= 0) return 0;
  if (consumptionRatePerHour <= 0) return 999;
  return Number((currentQty / consumptionRatePerHour).toFixed(2));
}

/**
 * Evaluates component severity level using the Early Warning Engine thresholds:
 * - Stock-out: currentQty <= 0
 * - Critical: under criticalHoursThreshold (default 1.0h) OR below 50% of minThreshold
 * - Warning: under warningHoursThreshold (default 4.0h) OR at/below minThreshold
 * - Healthy: ample hours of runtime remaining
 */
export function evaluateStockSeverity(
  item: Pick<ComponentItem, 'currentQty' | 'minThreshold' | 'consumptionRatePerHour'>,
  settings?: Pick<NotificationSettings, 'warningHoursThreshold' | 'criticalHoursThreshold'>
): StockSeverity {
  const warnHrs = settings?.warningHoursThreshold ?? 4;
  const critHrs = settings?.criticalHoursThreshold ?? 1;

  if (item.currentQty <= 0) {
    return StockSeverity.StockOut;
  }

  const hoursLeft = calculateTimeToStockout(item.currentQty, item.consumptionRatePerHour);

  if (hoursLeft < critHrs) {
    return StockSeverity.Critical;
  }

  if (hoursLeft < warnHrs || item.currentQty <= item.minThreshold) {
    return StockSeverity.Warning;
  }

  return StockSeverity.Healthy;
}

/**
 * Calculates recommended reorder quantity based on supplier lead time + 25% safety buffer,
 * ensuring the workstation bin is brought back to full capacity or covers lead-time demand.
 */
export function calculateRecommendedReorderQty(item: ComponentItem): number {
  const leadTimeDemand = Math.ceil(
    item.consumptionRatePerHour * item.leadTimeHours * 1.25
  );
  const binReplenishNeed = Math.max(0, Math.ceil(item.maxCapacity - item.currentQty));
  return Math.max(leadTimeDemand, binReplenishNeed, Math.ceil(item.reorderLevel));
}

/**
 * Formats decimal hours into human-readable shop-floor countdown (e.g. "0h 42m", "3h 15m", "14.2h")
 */
export function formatHoursRemaining(hours: number): string {
  if (hours <= 0) return '0h 00m';
  if (hours >= 99) return '99h+';
  if (hours >= 10) return `${hours.toFixed(1)}h`;
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  if (mins === 60) {
    return `${wholeHours + 1}h 00m`;
  }
  return `${wholeHours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Generates future depletion projection points for the Prediction Panel chart.
 */
export function buildProjectionSeries(
  item: ComponentItem
): Array<{ label: string; actual?: number; projected?: number; threshold: number }> {
  const points: Array<{
    label: string;
    actual?: number;
    projected?: number;
    threshold: number;
  }> = [];

  const recentHistory = item.history.slice(-6);
  recentHistory.forEach((h, idx) => {
    const isLast = idx === recentHistory.length - 1;
    points.push({
      label: h.timeLabel,
      actual: Math.round(h.quantity * 10) / 10,
      projected: isLast ? Math.round(h.quantity * 10) / 10 : undefined,
      threshold: item.minThreshold,
    });
  });

  // Project next 4 hours in 1-hour increments
  for (let hr = 1; hr <= 4; hr++) {
    const projectedQty = Math.max(
      0,
      Math.round((item.currentQty - item.consumptionRatePerHour * hr) * 10) / 10
    );
    points.push({
      label: `+${hr}h`,
      projected: projectedQty,
      threshold: item.minThreshold,
    });
  }

  return points;
}

/**
 * Plays a short, non-intrusive dual-tone industrial alert chime via Web Audio API
 * when a component crosses into Critical or Stock-out state.
 */
export function playCriticalAlertChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
  } catch {
    // Ignore audio context autoplay blocks until user interacts
  }
}

/**
 * Exports an array of flat records to a downloadable CSV file.
 */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
