import React, { useMemo, useState } from 'react';
import { Barcode, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import {
  Branch,
  ComponentItem,
  NotificationSettings,
  UserRole,
} from '../types';
import { TranslationStrings } from '../i18n';
import {
  calculateTimeToStockout,
  evaluateStockSeverity,
  formatHoursRemaining,
} from '../utils/warningEngine';
import { StatusIndicator } from './StatusIndicator';

interface ComponentsViewProps {
  branches: Branch[];
  components: ComponentItem[];
  settings: NotificationSettings;
  role: UserRole;
  t: TranslationStrings;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: ComponentItem) => void;
  onDeleteComponent: (componentId: string) => void;
  onBarcodeScanUpdate: (codeOrId: string, delta: number) => {
    ok: boolean;
    message: string;
  };
}

export const ComponentsView: React.FC<ComponentsViewProps> = ({
  branches,
  components,
  settings,
  role,
  t,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteComponent,
  onBarcodeScanUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');

  // Barcode / QR Scan state
  const [scanCode, setScanCode] = useState('SCN-BLT-101');
  const [scanDelta, setScanDelta] = useState('120');
  const [scanMode, setScanMode] = useState<'refill' | 'pull'>('refill');
  const [scanFeedback, setScanFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const canModifyCatalog =
    role === UserRole.Admin || role === UserRole.Supervisor;
  const canDelete = role === UserRole.Admin;

  const filteredComponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return components.filter((c) => {
      if (branchFilter !== 'all' && c.branchId !== branchFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.barcode.toLowerCase().includes(q) ||
        c.supplier.toLowerCase().includes(q) ||
        c.workstationId.toLowerCase().includes(q)
      );
    });
  }, [components, searchQuery, branchFilter]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, Number(scanDelta) || 0);
    const signedDelta = scanMode === 'refill' ? qty : -qty;
    const result = onBarcodeScanUpdate(scanCode.trim(), signedDelta);
    setScanFeedback(result);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Component Master & Barcode Station
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage workstation BOM thresholds, supplier lead times, and process handheld barcode/QR bin scans
          </p>
        </div>

        <button
          type="button"
          disabled={!canModifyCatalog}
          onClick={onOpenAddModal}
          title={
            canModifyCatalog
              ? 'Add new component'
              : 'Supervisor or Admin role required'
          }
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{t.actions.addComponent}</span>
        </button>
      </div>

      {/* Barcode / QR Quick-Scan Input Panel */}
      <section
        aria-labelledby="barcode-station-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2
              id="barcode-station-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <Barcode className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Shop-Floor Barcode / QR Bin Scanner</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scan or select a Kanban tag (e.g. SCN-BLT-101 or CMP-301) to post instant bin replenishment or line pull
            </p>
          </div>

          {/* Quick-Select Sample Barcodes */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Quick tags:</span>
            {components.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setScanCode(c.barcode)}
                className="px-2.5 py-1 font-mono rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0"
              >
                {c.barcode}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleScanSubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-5">
            <label
              htmlFor="barcode-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Barcode / Component ID
            </label>
            <input
              id="barcode-input"
              type="text"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="Scan barcode e.g. SCN-BLT-101"
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Operation
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setScanMode('refill')}
                className={`py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  scanMode === 'refill'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                + Refill
              </button>
              <button
                type="button"
                onClick={() => setScanMode('pull')}
                className={`py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  scanMode === 'pull'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                − Pull
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="scan-qty-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Quantity
            </label>
            <input
              id="scan-qty-input"
              type="number"
              min="1"
              step="1"
              value={scanDelta}
              onChange={(e) => setScanDelta(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              Post Scan
            </button>
          </div>
        </form>

        {scanFeedback && (
          <div
            className={`mt-3 text-xs font-medium ${
              scanFeedback.ok
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {scanFeedback.message}
          </div>
        )}
      </section>

      {/* Component Master Table */}
      <section
        aria-labelledby="component-catalog-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2
            id="component-catalog-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Tracked Components ({filteredComponents.length})
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, supplier..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-56 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              aria-label="Filter components by branch"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredComponents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No components match your search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                  <th className="py-3 px-5">ID / Barcode</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Station</th>
                  <th className="py-3 px-4 text-right">Qty / Min</th>
                  <th className="py-3 px-4 text-right">Burn/hr</th>
                  <th className="py-3 px-4">Status · Runtime</th>
                  <th className="py-3 px-4">Supplier · Lead</th>
                  <th className="py-3 px-5 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredComponents.map((item) => {
                  const hoursLeft = calculateTimeToStockout(
                    item.currentQty,
                    item.consumptionRatePerHour
                  );
                  const severity = evaluateStockSeverity(item, settings);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.id}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.barcode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.category} · Reorder at {item.reorderLevel} {item.unit}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.workstationId}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {Math.round(item.currentQty)}
                        </span>{' '}
                        <span className="text-slate-500">/ {item.minThreshold}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.consumptionRatePerHour} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusIndicator
                          severity={severity}
                          t={t}
                          suffix={formatHoursRemaining(hoursLeft)}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{item.supplier}</div>
                        <div className="font-mono tabular-nums text-slate-400">
                          {item.leadTimeHours}h lead time
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canModifyCatalog}
                            onClick={() => onOpenEditModal(item)}
                            title={
                              canModifyCatalog
                                ? `Edit ${item.name}`
                                : 'Supervisor or Admin required to edit'
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => onDeleteComponent(item.id)}
                            title={
                              canDelete
                                ? `Delete ${item.name}`
                                : 'Admin role required to delete components'
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
