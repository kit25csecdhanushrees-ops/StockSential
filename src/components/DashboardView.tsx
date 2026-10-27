import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  OctagonAlert,
  Plus,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  AlertItem,
  Branch,
  ComponentItem,
  NavTab,
  NotificationSettings,
  PurchaseRequest,
  StockSeverity,
  UserRole,
} from '../types';
import { TranslationStrings } from '../i18n';
import {
  buildProjectionSeries,
  calculateRecommendedReorderQty,
  calculateTimeToStockout,
  evaluateStockSeverity,
  formatHoursRemaining,
} from '../utils/warningEngine';
import { StatusIndicator } from './StatusIndicator';

interface DashboardViewProps {
  branches: Branch[];
  components: ComponentItem[];
  alerts: AlertItem[];
  purchaseRequests: PurchaseRequest[];
  settings: NotificationSettings;
  role: UserRole;
  t: TranslationStrings;
  onSimulateBurst: () => void;
  onRefillAtRisk: () => void;
  onRefillComponent: (id: string) => void;
  onOpenAddModal: () => void;
  onApprovePurchaseOrder: (poId: string) => void;
  onNavigateToBranchWorkstation: (branchId: string, workstationId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  branches,
  components,
  alerts,
  purchaseRequests,
  settings,
  role,
  t,
  onSimulateBurst,
  onRefillAtRisk,
  onRefillComponent,
  onOpenAddModal,
  onApprovePurchaseOrder,
  onNavigateToBranchWorkstation,
  onNavigate,
}) => {
  // Sort components by shortest time-to-stockout so operators see the highest risk first
  const enrichedComponents = useMemo(() => {
    return components
      .map((item) => {
        const hoursLeft = calculateTimeToStockout(
          item.currentQty,
          item.consumptionRatePerHour
        );
        const severity = evaluateStockSeverity(item, settings);
        const recommendedReorder = calculateRecommendedReorderQty(item);
        return {
          ...item,
          hoursLeft,
          severity,
          recommendedReorder,
        };
      })
      .sort((a, b) => a.hoursLeft - b.hoursLeft);
  }, [components, settings]);

  const [selectedPredId, setSelectedPredId] = useState<string>(
    () => enrichedComponents[0]?.id ?? 'CMP-101'
  );

  const selectedPredictionItem =
    enrichedComponents.find((c) => c.id === selectedPredId) ?? enrichedComponents[0];

  const stats = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let criticalOrOut = 0;
    enrichedComponents.forEach((c) => {
      if (c.severity === StockSeverity.Healthy) healthy++;
      else if (c.severity === StockSeverity.Warning) warning++;
      else criticalOrOut++;
    });
    const openAlerts = alerts.filter((a) => a.status !== 'resolved').length;
    return { healthy, warning, criticalOrOut, openAlerts };
  }, [enrichedComponents, alerts]);

  const projectionData = useMemo(() => {
    if (!selectedPredictionItem) return [];
    return buildProjectionSeries(selectedPredictionItem);
  }, [selectedPredictionItem]);

  const openPOs = useMemo(
    () => purchaseRequests.filter((po) => po.status !== 'received'),
    [purchaseRequests]
  );

  const canAddComponent = role === UserRole.Admin || role === UserRole.Supervisor;
  const canApprovePO = role === UserRole.Admin || role === UserRole.Supervisor;

  return (
    <div className="space-y-8">
      {/* Shop-Floor Simulation & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Shop-Floor Operations Overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Automated bin runtime tracking across {branches.length} branches ·{' '}
            {branches.reduce((acc, b) => acc + b.workstations.length, 0)} workstations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSimulateBurst}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>{t.actions.simulateConsumption}</span>
          </button>

          <button
            type="button"
            onClick={onRefillAtRisk}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{t.actions.refillLowStock}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            disabled={!canAddComponent}
            title={
              canAddComponent
                ? 'Add new line component'
                : 'Supervisor or Admin role required to add components'
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t.actions.addComponent}</span>
          </button>
        </div>
      </div>

      {/* 1. Summary KPI Strip (Single-elevation grid with hairline borders) */}
      <section aria-label="Production stock summary metrics">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.totalBranches}
            </div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {branches.length}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              12 active stations
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.trackedComponents}
            </div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
              {components.length}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Live bin telemetry
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.healthyStock}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {stats.healthy}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              ≥ {settings.warningHoursThreshold}h runtime left
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.lowWarning}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {stats.warning}
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Under {settings.warningHoursThreshold}h buffer
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.criticalStockout}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
                {stats.criticalOrOut}
              </span>
              <OctagonAlert className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Under {settings.criticalHoursThreshold}h or empty
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpi.activeAlerts}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                {stats.openAlerts}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
              >
                <span>Review</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {openPOs.length} auto-POs queued
            </div>
          </div>
        </div>
      </section>

      {/* 2. Branch × Workstation Heatmap Matrix (3 Branches × 4 Workstations) */}
      <section
        aria-labelledby="heatmap-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="heatmap-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {t.sections.heatmapTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any workstation cell to inspect its live component feed and replenish bins
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Healthy (≥{settings.warningHoursThreshold}h)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Warning (&lt;{settings.warningHoursThreshold}h)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <OctagonAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Critical (&lt;{settings.criticalHoursThreshold}h)</span>
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="grid grid-cols-1 lg:grid-cols-12 items-stretch"
            >
              <div className="lg:col-span-3 p-5 flex flex-col justify-center bg-slate-50/70 dark:bg-slate-950/40 lg:border-r border-slate-200 dark:border-slate-800">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {branch.code}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {branch.name.split('—')[1]?.trim() ?? branch.location}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Lead: {branch.shiftLead}
                </div>
              </div>

              <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                {branch.workstations.map((ws) => {
                  const wsItems = enrichedComponents.filter(
                    (c) => c.workstationId === ws.id
                  );
                  const worstItem = wsItems[0];
                  const severity = worstItem?.severity ?? StockSeverity.Healthy;

                  let cellTone =
                    'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 bg-white dark:bg-slate-900';
                  let StatusIcon = CheckCircle2;
                  let iconColor = 'text-emerald-600 dark:text-emerald-400';

                  if (
                    severity === StockSeverity.StockOut ||
                    severity === StockSeverity.Critical
                  ) {
                    cellTone =
                      'bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/70 dark:hover:bg-red-950/50';
                    StatusIcon =
                      severity === StockSeverity.StockOut ? XCircle : OctagonAlert;
                    iconColor = 'text-red-600 dark:text-red-400';
                  } else if (severity === StockSeverity.Warning) {
                    cellTone =
                      'bg-amber-50/60 dark:bg-amber-950/25 hover:bg-amber-100/60 dark:hover:bg-amber-950/40';
                    StatusIcon = AlertTriangle;
                    iconColor = 'text-amber-600 dark:text-amber-400';
                  }

                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => onNavigateToBranchWorkstation(branch.id, ws.id)}
                      className={`p-4 text-left transition-colors flex flex-col justify-between min-h-[112px] ${cellTone}`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div>
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {ws.code}
                          </span>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                            {ws.name}
                          </div>
                        </div>
                        <StatusIcon
                          className={`w-4 h-4 shrink-0 ${iconColor}`}
                          aria-hidden="true"
                        />
                      </div>

                      {worstItem ? (
                        <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/70 w-full">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {worstItem.name}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2 mt-1">
                            <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {Math.round(worstItem.currentQty)} {worstItem.unit}
                            </span>
                            <span
                              className={`font-mono tabular-nums text-xs font-bold ${iconColor}`}
                            >
                              {formatHoursRemaining(worstItem.hoursLeft)} left
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-slate-400">
                          No assigned components
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Prediction Panel & Depletion Trend Chart */}
      <section
        aria-labelledby="prediction-heading"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* Left: Priority Component Countdown List with Mini Sparklines */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2
              id="prediction-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Early Warning Priority Queue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by shortest time-to-stockout (Current Qty ÷ Burn Rate/hr)
            </p>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
            {enrichedComponents.slice(0, 7).map((item) => {
              const isSelected = selectedPredictionItem?.id === item.id;
              const strokeColor =
                item.severity === StockSeverity.Critical ||
                item.severity === StockSeverity.StockOut
                  ? '#dc2626'
                  : item.severity === StockSeverity.Warning
                  ? '#d97706'
                  : '#16a34a';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPredId(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPredId(item.id);
                    }
                  }}
                  className={`px-5 py-3.5 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {item.workstationId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{item.id}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {item.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <StatusIndicator
                        severity={item.severity}
                        t={t}
                        suffix={`${formatHoursRemaining(item.hoursLeft)}`}
                      />
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Reorder: {item.recommendedReorder} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Mini Trend Chart */}
                  <div className="w-20 h-10 shrink-0" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.history}>
                        <Line
                          type="monotone"
                          dataKey="quantity"
                          stroke={strokeColor}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Depletion Forecast & Reorder Calculator */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          {selectedPredictionItem ? (
            <>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {selectedPredictionItem.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedPredictionItem.workstationId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedPredictionItem.supplier}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {selectedPredictionItem.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRefillComponent(selectedPredictionItem.id)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {t.actions.refillUnit} ({selectedPredictionItem.maxCapacity}{' '}
                      {selectedPredictionItem.unit})
                    </span>
                  </button>
                </div>

                {/* Prediction Readout Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Est. Stock-out In
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {formatHoursRemaining(selectedPredictionItem.hoursLeft)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Current / Burn Rate
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {Math.round(selectedPredictionItem.currentQty)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({selectedPredictionItem.consumptionRatePerHour}/hr)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Recommended Reorder
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {selectedPredictionItem.recommendedReorder}{' '}
                      <span className="text-xs font-normal">
                        {selectedPredictionItem.unit}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Supplier Lead Time
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {selectedPredictionItem.leadTimeHours}h
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical + 4h Projected Depletion Line Chart */}
              <div className="mt-5 h-64 w-full">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Historical Stock Telemetry & +4h Depletion Forecast</span>
                  <span>
                    Min Threshold: {selectedPredictionItem.minThreshold}{' '}
                    {selectedPredictionItem.unit}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={projectionData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#94a3b8"
                      strokeOpacity={0.2}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      y={selectedPredictionItem.minThreshold}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Recorded Qty"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      name="Projected Depletion"
                      stroke="#dc2626"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              Add a component to view stock-out predictions.
            </div>
          )}
        </div>
      </section>

      {/* 4. Auto-Generated Purchase Requests Queue */}
      <section
        aria-labelledby="auto-po-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="auto-po-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {t.sections.autoPoTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically drafted when workstation stock drops to or below its Reorder Level
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {openPOs.length} open requests
          </span>
        </div>

        {openPOs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            All workstations are currently stocked above reorder levels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                  <th className="py-3 px-5">PO Number</th>
                  <th className="py-3 px-4">Station · Component</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Order Qty</th>
                  <th className="py-3 px-4 text-right">Lead Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {openPOs.slice(0, 5).map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {po.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {po.componentName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {po.workstationId} · {po.triggerReason}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {po.supplier}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {po.recommendedQty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      {po.leadTimeHours}h
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {po.status === 'pending_approval'
                        ? 'Pending Approval'
                        : 'Dispatched to Supplier'}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={!canApprovePO}
                        onClick={() => onApprovePurchaseOrder(po.id)}
                        title={
                          canApprovePO
                            ? 'Approve and receive stock into bin'
                            : 'Supervisor or Admin required to approve PO'
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        {po.status === 'pending_approval'
                          ? 'Approve & Receive'
                          : 'Receive Delivery'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
