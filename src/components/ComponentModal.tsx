import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Branch, ComponentItem } from '../types';

interface ComponentModalProps {
  isOpen: boolean;
  editingComponent: ComponentItem | null;
  branches: Branch[];
  existingIds: string[];
  onClose: () => void;
  onSave: (item: Omit<ComponentItem, 'lastUpdated' | 'history'>, isEdit: boolean) => void;
}

export const ComponentModal: React.FC<ComponentModalProps> = ({
  isOpen,
  editingComponent,
  branches,
  existingIds,
  onClose,
  onSave,
}) => {
  const defaultBranchId = branches[0]?.id ?? 'BR-A';
  const defaultWsId = branches[0]?.workstations[0]?.id ?? 'WS-A1';

  const [id, setId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fasteners');
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [workstationId, setWorkstationId] = useState(defaultWsId);
  const [currentQty, setCurrentQty] = useState('250');
  const [maxCapacity, setMaxCapacity] = useState('500');
  const [minThreshold, setMinThreshold] = useState('80');
  const [reorderLevel, setReorderLevel] = useState('120');
  const [consumptionRatePerHour, setConsumptionRatePerHour] = useState('30');
  const [unit, setUnit] = useState('pcs');
  const [supplier, setSupplier] = useState('');
  const [leadTimeHours, setLeadTimeHours] = useState('8');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingComponent) {
      setId(editingComponent.id);
      setBarcode(editingComponent.barcode);
      setName(editingComponent.name);
      setCategory(editingComponent.category);
      setBranchId(editingComponent.branchId);
      setWorkstationId(editingComponent.workstationId);
      setCurrentQty(String(editingComponent.currentQty));
      setMaxCapacity(String(editingComponent.maxCapacity));
      setMinThreshold(String(editingComponent.minThreshold));
      setReorderLevel(String(editingComponent.reorderLevel));
      setConsumptionRatePerHour(String(editingComponent.consumptionRatePerHour));
      setUnit(editingComponent.unit);
      setSupplier(editingComponent.supplier);
      setLeadTimeHours(String(editingComponent.leadTimeHours));
    } else {
      const nextNum = 401 + existingIds.length;
      setId(`CMP-${nextNum}`);
      setBarcode(`SCN-PRT-${nextNum}`);
      setName('');
      setCategory('Fasteners');
      setBranchId(defaultBranchId);
      setWorkstationId(defaultWsId);
      setCurrentQty('240');
      setMaxCapacity('500');
      setMinThreshold('80');
      setReorderLevel('120');
      setConsumptionRatePerHour('35');
      setUnit('pcs');
      setSupplier('Sundram Fasteners Ltd.');
      setLeadTimeHours('8');
    }
  }, [isOpen, editingComponent, defaultBranchId, defaultWsId, existingIds.length]);

  if (!isOpen) return null;

  const selectedBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const availableWorkstations = selectedBranch?.workstations ?? [];

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const nextBranch = branches.find((b) => b.id === newBranchId);
    if (nextBranch && nextBranch.workstations.length > 0) {
      setWorkstationId(nextBranch.workstations[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = id.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedSupplier = supplier.trim();

    if (!trimmedId || !trimmedName || !trimmedSupplier) {
      setError('Component ID, Name, and Supplier are required.');
      return;
    }

    if (!editingComponent && existingIds.includes(trimmedId)) {
      setError(`Component ID "${trimmedId}" already exists.`);
      return;
    }

    const qty = Math.max(0, Number(currentQty) || 0);
    const minT = Math.max(1, Number(minThreshold) || 1);
    const reorder = Math.max(minT, Number(reorderLevel) || minT);
    const cap = Math.max(reorder, qty, Number(maxCapacity) || reorder * 2);
    const rate = Math.max(0.5, Number(consumptionRatePerHour) || 1);
    const lead = Math.max(1, Number(leadTimeHours) || 1);

    onSave(
      {
        id: trimmedId,
        barcode: barcode.trim().toUpperCase() || `SCN-${trimmedId}`,
        name: trimmedName,
        category: category.trim() || 'General',
        branchId,
        workstationId,
        currentQty: qty,
        maxCapacity: cap,
        minThreshold: minT,
        reorderLevel: reorder,
        consumptionRatePerHour: rate,
        unit: unit.trim() || 'pcs',
        supplier: trimmedSupplier,
        leadTimeHours: lead,
      },
      Boolean(editingComponent)
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="component-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="component-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {editingComponent ? `Edit Component · ${editingComponent.id}` : 'Add Line Component'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Component ID
              </label>
              <input
                type="text"
                value={id}
                disabled={Boolean(editingComponent)}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Barcode / QR Tag
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Fasteners">Fasteners</option>
                <option value="Electronics">Electronics</option>
                <option value="Bearings">Bearings</option>
                <option value="Seals & Gaskets">Seals & Gaskets</option>
                <option value="Motors & Drives">Motors & Drives</option>
                <option value="Power Distribution">Power Distribution</option>
                <option value="Thermal">Thermal</option>
                <option value="Wiring">Wiring</option>
                <option value="Structural">Structural</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Component Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. M6 Stainless Socket Cap Screws"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Workstation
              </label>
              <select
                value={workstationId}
                onChange={(e) => setWorkstationId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {availableWorkstations.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.code} — {ws.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Qty
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Min Threshold
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reorder Level
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bin Capacity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Burn Rate (/hr)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={consumptionRatePerHour}
                onChange={(e) => setConsumptionRatePerHour(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Time (hrs)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={leadTimeHours}
                onChange={(e) => setLeadTimeHours(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Supplier
              </label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              {editingComponent ? 'Save Changes' : 'Add Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
