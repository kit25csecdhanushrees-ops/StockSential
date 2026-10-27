import React from 'react';
import { AlertTriangle, CheckCircle2, OctagonAlert, XCircle } from 'lucide-react';
import { StockSeverity } from '../types';
import { TranslationStrings } from '../i18n';

interface StatusIndicatorProps {
  severity: StockSeverity;
  t: TranslationStrings;
  suffix?: string;
}

/**
 * Renders semantic stock status as clean, unboxed text paired with an explicit icon
 * so color-blind operators never rely on hue alone and zero static pills are used.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  severity,
  t,
  suffix,
}) => {
  if (severity === StockSeverity.StockOut) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t.status.stockout}</span>
        {suffix && (
          <>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums">{suffix}</span>
          </>
        )}
      </span>
    );
  }

  if (severity === StockSeverity.Critical) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
        <OctagonAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t.status.critical}</span>
        {suffix && (
          <>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums">{suffix}</span>
          </>
        )}
      </span>
    );
  }

  if (severity === StockSeverity.Warning) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t.status.warning}</span>
        {suffix && (
          <>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums">{suffix}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t.status.healthy}</span>
      {suffix && (
        <>
          <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums">{suffix}</span>
        </>
      )}
    </span>
  );
};
