import React, { useMemo, useState } from 'react';
import { Bell, Check, Mail, MessageSquare, RefreshCw, Volume2 } from 'lucide-react';
import {
  AlertItem,
  AlertStatus,
  DispatchLogEntry,
  NotificationSettings,
  UserRole,
} from '../types';
import { TranslationStrings } from '../i18n';
import { formatHoursRemaining } from '../utils/warningEngine';
import { StatusIndicator } from './StatusIndicator';

interface AlertsViewProps {
  alerts: AlertItem[];
  dispatchLogs: DispatchLogEntry[];
  settings: NotificationSettings;
  role: UserRole;
  t: TranslationStrings;
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAndRefillAlert: (alertId: string) => void;
  onUpdateSettings: (partial: Partial<NotificationSettings>) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  dispatchLogs,
  settings,
  role,
  t,
  onAcknowledgeAlert,
  onResolveAndRefillAlert,
  onUpdateSettings,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (branchFilter !== 'all' && alert.branchId !== branchFilter) return false;
      return true;
    });
  }, [alerts, statusFilter, branchFilter]);

  const canConfigureChannels =
    role === UserRole.Admin || role === UserRole.Supervisor;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Alerts & Notification Dispatch
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Acknowledge early warnings, trigger emergency bin replenishment, and manage shop-floor alert channels
          </p>
        </div>

        {/* Interactive Status Filter Controls */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 self-start"
          role="tablist"
          aria-label="Filter alerts by status"
        >
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map((st) => (
            <button
              key={st}
              type="button"
              role="tab"
              aria-selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Notification Channels Bar */}
      <section
        aria-labelledby="channels-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="channels-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Notification Routing Channels
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Toggle real-time dispatch destinations when Warning (&lt;{settings.warningHoursThreshold}h) or Critical (&lt;{settings.criticalHoursThreshold}h) thresholds trigger
            </p>
          </div>
          {!canConfigureChannels && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Supervisor or Admin role required to modify routing
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          <div className="p-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Mail className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Email Dispatch</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">
                {settings.emailRecipient}
              </p>
            </div>
            <button
              type="button"
              disabled={!canConfigureChannels}
              onClick={() =>
                onUpdateSettings({ emailEnabled: !settings.emailEnabled })
              }
              aria-pressed={settings.emailEnabled}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                settings.emailEnabled
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.emailEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          <div className="p-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <MessageSquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>SMS Line Pager</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.smsRecipient}
              </p>
            </div>
            <button
              type="button"
              disabled={!canConfigureChannels}
              onClick={() =>
                onUpdateSettings({ smsEnabled: !settings.smsEnabled })
              }
              aria-pressed={settings.smsEnabled}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                settings.smsEnabled
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.smsEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          <div className="p-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Bell className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Dashboard Banner</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Prominent visual flash on critical alerts
              </p>
            </div>
            <button
              type="button"
              disabled={!canConfigureChannels}
              onClick={() =>
                onUpdateSettings({
                  dashboardBannerEnabled: !settings.dashboardBannerEnabled,
                })
              }
              aria-pressed={settings.dashboardBannerEnabled}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                settings.dashboardBannerEnabled
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.dashboardBannerEnabled ? 'Enabled' : 'Hidden'}
            </button>
          </div>

          <div className="p-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Volume2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Critical Chime</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dual-tone audio signal on new critical alert
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  audioChimeEnabled: !settings.audioChimeEnabled,
                })
              }
              aria-pressed={settings.audioChimeEnabled}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                settings.audioChimeEnabled
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {settings.audioChimeEnabled ? 'Sound On' : 'Muted'}
            </button>
          </div>
        </div>
      </section>

      {/* Active & Historical Alerts Table */}
      <section
        aria-labelledby="alerts-table-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="alerts-table-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Alert History & Resolution Queue ({filteredAlerts.length})
          </h2>

          <div className="flex items-center gap-2">
            <label
              htmlFor="alert-branch-filter"
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Branch:
            </label>
            <select
              id="alert-branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Branches</option>
              <option value="BR-A">Branch A</option>
              <option value="BR-B">Branch B</option>
              <option value="BR-C">Branch C</option>
            </select>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No alerts match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                  <th className="py-3 px-5">Alert ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Branch · Workstation</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4 text-right">Runtime Left</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Triggered</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredAlerts.map((alert) => {
                  const timeStr = new Date(alert.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {alert.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusIndicator severity={alert.severity} t={t} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="font-semibold">{alert.branchName}</span>
                        <span aria-hidden="true" className="mx-1.5 text-slate-400">
                          ·
                        </span>
                        <span>{alert.workstationName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {alert.componentName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {alert.componentId} · {Math.round(alert.quantityAtTrigger)} units at trigger ·{' '}
                          {alert.channelsDispatched.join(' / ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatHoursRemaining(alert.hoursRemainingAtTrigger)}
                      </td>
                      <td className="py-3.5 px-4 text-xs capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {alert.status}
                        {alert.acknowledgedBy ? ` (${alert.acknowledgedBy})` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {alert.status === 'resolved' ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Closed
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {alert.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => onAcknowledgeAlert(alert.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.actions.acknowledge}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onResolveAndRefillAlert(alert.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
                            >
                              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.actions.resolveRefill}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Outbound Notification Dispatch Log */}
      <section
        aria-labelledby="dispatch-log-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="dispatch-log-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Outbound Channel & Telemetry Log
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto">
          {dispatchLogs.slice(0, 12).map((entry) => (
            <div
              key={entry.id}
              className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {entry.channel}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {entry.recipient}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span>{entry.message}</span>
              </div>
              <span className="font-mono tabular-nums text-slate-400 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
