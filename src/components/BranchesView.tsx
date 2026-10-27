import React from 'react';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import {
  Branch,
  ComponentItem,
  NotificationSettings,
  StockSeverity,
} from '../types';
import { TranslationStrings } from '../i18n';
import {
  calculateTimeToStockout,
  evaluateStockSeverity,
  formatHoursRemaining,
} from '../utils/warningEngine';
import { StatusIndicator } from './StatusIndicator';

interface BranchesViewProps {
  branches: Branch[];
  components: ComponentItem[];
  settings: NotificationSettings;
  selectedBranchId: string;
  highlightedWorkstationId: string | null;
  t: TranslationStrings;
  onSelectBranch: (branchId: string) => void;
  onAdjustQuantity: (componentId: string, delta: number, reason: string) => void;
  onRefillComponent: (componentId: string) => void;
}

export const BranchesView: React.FC<BranchesViewProps> = ({
  branches,
  components,
  settings,
  selectedBranchId,
  highlightedWorkstationId,
  t,
  onSelectBranch,
  onAdjustQuantity,
  onRefillComponent,
}) => {
  const activeBranch =
    branches.find((b) => b.id === selectedBranchId) ?? branches[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Branch & Workstation Monitor
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Inspect live workstation quantities, minimum thresholds, reorder triggers, and hourly burn rates
          </p>
        </div>

        {/* Interactive Segmented Branch Selector */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 self-start"
          role="tablist"
          aria-label="Select production branch"
        >
          {branches.map((branch) => {
            const branchItems = components.filter((c) => c.branchId === branch.id);
            const hasCritical = branchItems.some((c) => {
              const sev = evaluateStockSeverity(c, settings);
              return (
                sev === StockSeverity.Critical || sev === StockSeverity.StockOut
              );
            });
            const isActive = branch.id === activeBranch.id;

            return (
              <button
                key={branch.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onSelectBranch(branch.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>{branch.code}</span>
                {hasCritical && (
                  <span className="ml-1.5 text-red-600 dark:text-red-400 font-mono">
                    (!)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Branch Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {activeBranch.name}
          </span>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <span>{activeBranch.location}</span>
        </div>
        <div>
          Shift Supervisor:{' '}
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {activeBranch.shiftLead}
          </span>
        </div>
      </div>

      {/* Workstations List (Single-elevation containers per workstation, clean divided rows inside) */}
      <div className="space-y-6">
        {activeBranch.workstations.map((ws) => {
          const wsComponents = components.filter((c) => c.workstationId === ws.id);
          const isHighlighted = highlightedWorkstationId === ws.id;

          return (
            <section
              key={ws.id}
              aria-labelledby={`ws-title-${ws.id}`}
              className={`rounded-xl border transition-colors bg-white dark:bg-slate-900 overflow-hidden ${
                isHighlighted
                  ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ws.code}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                  <h2
                    id={`ws-title-${ws.id}`}
                    className="text-base font-bold text-slate-900 dark:text-slate-100"
                  >
                    {ws.name}
                  </h2>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Telemetry Source: {ws.sensorType} · {wsComponents.length} tracked{' '}
                  {wsComponents.length === 1 ? 'component' : 'components'}
                </div>
              </div>

              {wsComponents.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                  No components assigned to this workstation.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {wsComponents.map((item) => {
                    const hoursLeft = calculateTimeToStockout(
                      item.currentQty,
                      item.consumptionRatePerHour
                    );
                    const severity = evaluateStockSeverity(item, settings);
                    const pct = Math.min(
                      100,
                      Math.max(0, Math.round((item.currentQty / item.maxCapacity) * 100))
                    );

                    const barColor =
                      severity === StockSeverity.Critical ||
                      severity === StockSeverity.StockOut
                        ? 'bg-red-600 dark:bg-red-500'
                        : severity === StockSeverity.Warning
                        ? 'bg-amber-500'
                        : 'bg-emerald-600 dark:bg-emerald-500';

                    return (
                      <div key={item.id} className="p-6 space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {item.id}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{item.barcode}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>Supplier: {item.supplier}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <StatusIndicator
                              severity={severity}
                              t={t}
                              suffix={`${formatHoursRemaining(hoursLeft)} left`}
                            />

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onAdjustQuantity(
                                    item.id,
                                    -Math.max(5, Math.round(item.consumptionRatePerHour * 0.25)),
                                    'Manual line pull'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                                title="Simulate workstation pull (15m burn)"
                              >
                                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Pull</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  onAdjustQuantity(
                                    item.id,
                                    Math.max(10, Math.round(item.maxCapacity * 0.2)),
                                    'Tote top-up'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                                title="Add 20% tote replenishment"
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>+20%</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onRefillComponent(item.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
                              >
                                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.actions.refillUnit}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quantitative Metrics Row + Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-600 dark:text-slate-400">
                              <span>
                                Current Quantity:{' '}
                                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                                  {Math.round(item.currentQty)} / {item.maxCapacity}{' '}
                                  {item.unit}
                                </strong>
                              </span>
                              <span>
                                Min Threshold:{' '}
                                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                                  {item.minThreshold} {item.unit}
                                </strong>
                              </span>
                              <span>
                                Reorder Level:{' '}
                                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                                  {item.reorderLevel} {item.unit}
                                </strong>
                              </span>
                              <span>
                                Consumption Rate:{' '}
                                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                                  {item.consumptionRatePerHour} {item.unit}/hr
                                </strong>
                              </span>
                            </div>

                            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                              {pct}% bin fill
                            </span>
                          </div>

                          <div
                            className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${item.name} stock level ${pct}%`}
                          >
                            <div
                              className={`h-full transition-transform duration-200 origin-left ${barColor}`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
