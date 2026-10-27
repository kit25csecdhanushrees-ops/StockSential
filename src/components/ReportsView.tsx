import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import {
  AlertItem,
  Branch,
  ComponentItem,
  NotificationSettings,
} from '../types';
import { TranslationStrings } from '../i18n';
import {
  calculateRecommendedReorderQty,
  calculateTimeToStockout,
  downloadCsvFile,
  evaluateStockSeverity,
  formatHoursRemaining,
} from '../utils/warningEngine';
import { StatusIndicator } from './StatusIndicator';

interface ReportsViewProps {
  branches: Branch[];
  components: ComponentItem[];
  alerts: AlertItem[];
  settings: NotificationSettings;
  t: TranslationStrings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  branches,
  components,
  alerts,
  settings,
  t,
}) => {
  const [branchFilter, setBranchFilter] = useState('all');
  const [componentFilter, setComponentFilter] = useState('all');
  const [dateWindow, setDateWindow] = useState<'today' | '7d' | '30d'>('today');

  const filteredComponents = useMemo(() => {
    return components.filter((item) => {
      if (branchFilter !== 'all' && item.branchId !== branchFilter) return false;
      if (componentFilter !== 'all' && item.id !== componentFilter) return false;
      return true;
    });
  }, [components, branchFilter, componentFilter]);

  const branchChartData = useMemo(() => {
    return branches.map((b) => {
      const bItems = components.filter((c) => c.branchId === b.id);
      const avgHours =
        bItems.length > 0
          ? Number(
              (
                bItems.reduce(
                  (sum, c) =>
                    sum +
                    Math.min(
                      24,
                      calculateTimeToStockout(c.currentQty, c.consumptionRatePerHour)
                    ),
                  0
                ) / bItems.length
              ).toFixed(1)
            )
          : 0;
      const totalHourlyBurn = bItems.reduce(
        (sum, c) => sum + c.consumptionRatePerHour,
        0
      );
      return {
        branch: b.code,
        avgRuntimeHours: avgHours,
        hourlyUnitsConsumed: totalHourlyBurn,
      };
    });
  }, [branches, components]);

  const handleExportInventoryCsv = () => {
    const headers = [
      'Component ID',
      'Barcode',
      'Component Name',
      'Category',
      'Branch ID',
      'Workstation ID',
      'Current Quantity',
      'Unit',
      'Min Threshold',
      'Reorder Level',
      'Consumption Rate (/hr)',
      'Est. Hours Remaining',
      'Severity Status',
      'Recommended Reorder Qty',
      'Supplier',
      'Lead Time (hrs)',
      'Report Window',
    ];

    const rows = filteredComponents.map((item) => {
      const hrs = calculateTimeToStockout(
        item.currentQty,
        item.consumptionRatePerHour
      );
      const sev = evaluateStockSeverity(item, settings);
      const recQty = calculateRecommendedReorderQty(item);
      return [
        item.id,
        item.barcode,
        item.name,
        item.category,
        item.branchId,
        item.workstationId,
        Math.round(item.currentQty),
        item.unit,
        item.minThreshold,
        item.reorderLevel,
        item.consumptionRatePerHour,
        hrs,
        sev.toUpperCase(),
        recQty,
        item.supplier,
        item.leadTimeHours,
        dateWindow,
      ];
    });

    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`stocksentinel-inventory-report-${dateTag}.csv`, headers, rows);
  };

  const handleExportAlertsCsv = () => {
    const headers = [
      'Alert ID',
      'Severity',
      'Branch',
      'Workstation',
      'Component ID',
      'Component Name',
      'Hours Left At Trigger',
      'Qty At Trigger',
      'Status',
      'Triggered Timestamp',
    ];

    const rows = alerts
      .filter((a) => branchFilter === 'all' || a.branchId === branchFilter)
      .map((a) => [
        a.id,
        a.severity.toUpperCase(),
        a.branchName,
        a.workstationName,
        a.componentId,
        a.componentName,
        a.hoursRemainingAtTrigger,
        Math.round(a.quantityAtTrigger),
        a.status,
        a.createdAt,
      ]);

    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`stocksentinel-alert-history-${dateTag}.csv`, headers, rows);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Production Line Reports & CSV Export
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Audit branch runtime buffers, hourly burn rates, and export line replenishment schedules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAlertsCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Export Alert Log CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportInventoryCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t.actions.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* Report Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <label
            htmlFor="report-branch-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Filter by Branch
          </label>
          <select
            id="report-branch-select"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setComponentFilter('all');
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Branches (Plant-Wide)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="report-component-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Filter by Component
          </label>
          <select
            id="report-component-select"
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Tracked Components</option>
            {components
              .filter((c) => branchFilter === 'all' || c.branchId === branchFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="report-date-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Reporting Window
          </label>
          <select
            id="report-date-select"
            value={dateWindow}
            onChange={(e) =>
              setDateWindow(e.target.value as 'today' | '7d' | '30d')
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="today">Current Shift (Today)</option>
            <option value="7d">Rolling 7 Days</option>
            <option value="30d">Rolling 30 Days</option>
          </select>
        </div>
      </div>

      {/* Branch Runtime & Hourly Consumption Chart */}
      <section
        aria-labelledby="branch-analytics-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2
              id="branch-analytics-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Average Workstation Runtime Buffer vs. Hourly Consumption by Branch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compares mean hours before stock-out against aggregate unit burn rate per hour
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={branchChartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#94a3b8"
                strokeOpacity={0.2}
              />
              <XAxis
                dataKey="branch"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={45}
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
              <Bar
                dataKey="avgRuntimeHours"
                name="Avg Runtime Buffer (hrs)"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="hourlyUnitsConsumed"
                name="Aggregate Units Consumed / hr"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Filtered Report Data Table */}
      <section
        aria-labelledby="report-table-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="report-table-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Replenishment & Runtime Audit Sheet ({filteredComponents.length} rows)
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Window: {dateWindow.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 px-5">Component</th>
                <th className="py-3 px-4">Branch · Station</th>
                <th className="py-3 px-4 text-right">Current Qty</th>
                <th className="py-3 px-4 text-right">Burn / hr</th>
                <th className="py-3 px-4 text-right">Time-to-Stockout</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-5 text-right">Rec. Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredComponents.map((item) => {
                const hrs = calculateTimeToStockout(
                  item.currentQty,
                  item.consumptionRatePerHour
                );
                const sev = evaluateStockSeverity(item, settings);
                const recOrder = calculateRecommendedReorderQty(item);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {item.id} · {item.supplier}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.branchId} · {item.workstationId}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {Math.round(item.currentQty)} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                      {item.consumptionRatePerHour} / hr
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatHoursRemaining(hrs)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusIndicator severity={sev} t={t} />
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      {recOrder} {item.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
