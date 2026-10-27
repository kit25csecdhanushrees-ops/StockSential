import React, { useState } from 'react';
import { Cpu, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import {
  ComponentItem,
  LanguageCode,
  NotificationSettings,
  UserRole,
} from '../types';

interface SettingsViewProps {
  components: ComponentItem[];
  settings: NotificationSettings;
  role: UserRole;
  language: LanguageCode;
  darkMode: boolean;
  onChangeRole: (role: UserRole) => void;
  onChangeLanguage: (lang: LanguageCode) => void;
  onToggleDarkMode: () => void;
  onUpdateSettings: (partial: Partial<NotificationSettings>) => void;
  onSimulateIotWebhook: (payload: {
    sensorType: 'load_cell' | 'rfid_gate';
    componentId: string;
    reportedQty: number;
  }) => void;
  onResetFactoryData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  components,
  settings,
  role,
  language,
  darkMode,
  onChangeRole,
  onChangeLanguage,
  onToggleDarkMode,
  onUpdateSettings,
  onSimulateIotWebhook,
  onResetFactoryData,
}) => {
  const [iotSensorType, setIotSensorType] = useState<'load_cell' | 'rfid_gate'>(
    'load_cell'
  );
  const [iotComponentId, setIotComponentId] = useState(
    components[0]?.id ?? 'CMP-101'
  );
  const [iotReportedQty, setIotReportedQty] = useState('42');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const selectedIotComp =
    components.find((c) => c.id === iotComponentId) ?? components[0];

  const samplePayloadJson = JSON.stringify(
    {
      device_id:
        iotSensorType === 'load_cell'
          ? `SCL-${selectedIotComp?.workstationId ?? 'WS-A1'}-01`
          : `RFID-${selectedIotComp?.workstationId ?? 'WS-C1'}-GATE`,
      protocol: iotSensorType === 'load_cell' ? 'RS485-Modbus/HTTP' : 'EPC-Gen2-UHF',
      workstation_id: selectedIotComp?.workstationId ?? 'WS-A1',
      component_id: iotComponentId,
      net_quantity: Math.max(0, Number(iotReportedQty) || 0),
      unit_mass_g: iotSensorType === 'load_cell' ? 18.4 : undefined,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const handleFireWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(0, Number(iotReportedQty) || 0);
    onSimulateIotWebhook({
      sensorType: iotSensorType,
      componentId: iotComponentId,
      reportedQty: qty,
    });
    setWebhookStatus(
      `200 OK — Updated ${iotComponentId} to ${qty} units via simulated ${
        iotSensorType === 'load_cell' ? 'Load-Cell Scale' : 'UHF RFID Reader'
      } payload.`
    );
  };

  const canEditThresholds =
    role === UserRole.Admin || role === UserRole.Supervisor;

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          System Configuration & IoT Telemetry API
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure role-based access, early-warning thresholds, regional localization, and hardware sensor endpoints
        </p>
      </div>

      {/* Role-Based Login & Localization Preferences */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Role-Based Access Control (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch active plant session role to verify permission boundaries across Operator, Supervisor, and Admin workflows.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(
              [
                {
                  id: UserRole.Operator,
                  label: 'Operator',
                  desc: 'Scan & refill bins, acknowledge alerts',
                },
                {
                  id: UserRole.Supervisor,
                  label: 'Supervisor',
                  desc: 'Add/edit parts, approve POs, tune alerts',
                },
                {
                  id: UserRole.Admin,
                  label: 'Admin',
                  desc: 'Full catalog delete, IoT & factory reset',
                },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onChangeRole(r.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  role === r.id
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-50'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">{r.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {r.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Shop-Floor Display & Language
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adapt interface contrast for overhead plant lighting and regional operator teams
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Operator Language
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'ta', label: 'தமிழ் (Tamil)' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onChangeLanguage(lang.code)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    language === lang.code
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Color Theme
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                High-contrast slate dark mode for low-glare shop monitors
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
          </div>
        </div>
      </section>

      {/* Early Warning Engine Threshold Tuning */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Early-Warning Engine Runtime Thresholds
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Formula: Time-to-Stockout = Current Quantity ÷ Hourly Consumption Rate
            </p>
          </div>
          {!canEditThresholds && (
            <span className="text-xs text-slate-500">
              Read-only for Operator role
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <label
              htmlFor="warn-hours-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Warning Lead Window (hours remaining)
            </label>
            <input
              id="warn-hours-input"
              type="number"
              min="1.5"
              max="24"
              step="0.5"
              disabled={!canEditThresholds}
              value={settings.warningHoursThreshold}
              onChange={(e) =>
                onUpdateSettings({
                  warningHoursThreshold: Math.max(
                    1.5,
                    Number(e.target.value) || 4
                  ),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Components below this runtime enter Warning (amber) status.
            </p>
          </div>

          <div>
            <label
              htmlFor="crit-hours-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Critical Escalation Window (hours remaining)
            </label>
            <input
              id="crit-hours-input"
              type="number"
              min="0.25"
              max="6"
              step="0.25"
              disabled={!canEditThresholds}
              value={settings.criticalHoursThreshold}
              onChange={(e) =>
                onUpdateSettings({
                  criticalHoursThreshold: Math.max(
                    0.25,
                    Number(e.target.value) || 1
                  ),
                })
              }
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Components below this runtime trigger Critical banner & SMS pager alerts.
            </p>
          </div>
        </div>
      </section>

      {/* IoT Hardware Integration & REST Webhook Simulator */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            IoT Sensor & RFID Integration Contract
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleFireWebhook} className="lg:col-span-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Physical RS-485 load-cell bin scales and UHF RFID Kanban gates stream real-time net counts to{' '}
              <code className="font-mono text-slate-900 dark:text-slate-200">
                POST /api/v1/telemetry/stock-event
              </code>
              . Test an incoming sensor packet below to update live workstation state:
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hardware Sensor Class
              </label>
              <select
                value={iotSensorType}
                onChange={(e) =>
                  setIotSensorType(e.target.value as 'load_cell' | 'rfid_gate')
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="load_cell">
                  RS-485 Load-Cell Bin Scale (Weight → Count)
                </option>
                <option value="rfid_gate">
                  EPC Gen2 UHF RFID Kanban Reader
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Workstation Component
              </label>
              <select
                value={iotComponentId}
                onChange={(e) => setIotComponentId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.workstationId} · {c.id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sensor Reported Net Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={iotReportedQty}
                onChange={(e) => setIotReportedQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Send Test Sensor Payload</span>
            </button>

            {webhookStatus && (
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {webhookStatus}
              </div>
            )}
          </form>

          <div className="lg:col-span-7">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              REST Endpoint Schema · POST /api/v1/telemetry/stock-event
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {samplePayloadJson}
            </pre>
          </div>
        </div>
      </section>

      {/* Factory Data Reset */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Reset LocalStorage Demo State
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Restore all 3 branches, 12 workstations, sample components, and initial alerts to factory defaults
          </p>
        </div>

        <button
          type="button"
          disabled={role !== UserRole.Admin}
          onClick={onResetFactoryData}
          title={
            role === UserRole.Admin
              ? 'Reset all stored data to factory defaults'
              : 'Admin role required to reset plant dataset'
          }
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Reset to Factory Data</span>
        </button>
      </section>
    </div>
  );
};
