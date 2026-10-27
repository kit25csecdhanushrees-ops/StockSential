import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  GitBranch,
  LayoutDashboard,
  Menu,
  Moon,
  OctagonAlert,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import {
  INITIAL_ALERTS,
  INITIAL_BRANCHES,
  INITIAL_COMPONENTS,
  INITIAL_DISPATCH_LOGS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_PURCHASE_REQUESTS,
} from './data/initialData';
import { TRANSLATIONS } from './i18n';
import {
  AlertItem,
  ComponentItem,
  DispatchLogEntry,
  LanguageCode,
  NavTab,
  NotificationSettings,
  PurchaseRequest,
  StockSeverity,
  UserRole,
} from './types';
import {
  calculateRecommendedReorderQty,
  calculateTimeToStockout,
  evaluateStockSeverity,
  formatHoursRemaining,
  playCriticalAlertChime,
} from './utils/warningEngine';
import { DashboardView } from './components/DashboardView';
import { BranchesView } from './components/BranchesView';
import { AlertsView } from './components/AlertsView';
import { ComponentsView } from './components/ComponentsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ComponentModal } from './components/ComponentModal';

const STORAGE_KEYS = {
  components: 'stocksentinel_v1_components',
  alerts: 'stocksentinel_v1_alerts',
  pos: 'stocksentinel_v1_pos',
  logs: 'stocksentinel_v1_dispatch_logs',
  settings: 'stocksentinel_v1_settings',
  theme: 'stocksentinel_v1_dark',
  lang: 'stocksentinel_v1_lang',
  role: 'stocksentinel_v1_role',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const branches = INITIAL_BRANCHES;

  const [components, setComponents] = useState<ComponentItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.components, INITIAL_COMPONENTS)
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.alerts, INITIAL_ALERTS)
  );
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    () => loadFromStorage(STORAGE_KEYS.pos, INITIAL_PURCHASE_REQUESTS)
  );
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.logs, INITIAL_DISPATCH_LOGS)
  );
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    loadFromStorage(STORAGE_KEYS.settings, INITIAL_NOTIFICATION_SETTINGS)
  );
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.theme, false)
  );
  const [language, setLanguage] = useState<LanguageCode>(() =>
    loadFromStorage(STORAGE_KEYS.lang, 'en')
  );
  const [role, setRole] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.role, UserRole.Admin)
  );

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('BR-A');
  const [highlightedWorkstationId, setHighlightedWorkstationId] = useState<
    string | null
  >(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  const [bannerFlashKey, setBannerFlashKey] = useState(0);

  // Add / Edit Component Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<ComponentItem | null>(null);

  const t = TRANSLATIONS[language];

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(darkMode));
    } catch {
      // ignore storage quota errors
    }
  }, [darkMode]);

  // Persist operational state to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.components,
        JSON.stringify(components)
      );
    } catch {
      // ignore
    }
  }, [components]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }, [alerts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.pos,
        JSON.stringify(purchaseRequests)
      );
    } catch {
      // ignore
    }
  }, [purchaseRequests]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.logs,
        JSON.stringify(dispatchLogs)
      );
    } catch {
      // ignore
    }
  }, [dispatchLogs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify(settings)
      );
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.lang, JSON.stringify(language));
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.role, JSON.stringify(role));
    } catch {
      // ignore
    }
  }, [role]);

  // Keep latest refs for the early-warning reconciliation pass
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /**
   * Reconciles alerts and auto-generated purchase orders whenever component quantities change.
   */
  const reconcileEarlyWarnings = useCallback(
    (nextComponents: ComponentItem[]) => {
      const currentSettings = settingsRef.current;
      const nowIso = new Date().toISOString();
      let triggeredNewCritical = false;
      const newLogs: DispatchLogEntry[] = [];

      setAlerts((prevAlerts) => {
        let updated = [...prevAlerts];
        let changed = false;

        nextComponents.forEach((comp) => {
          const sev = evaluateStockSeverity(comp, currentSettings);
          const hoursLeft = calculateTimeToStockout(
            comp.currentQty,
            comp.consumptionRatePerHour
          );

          const openIdx = updated.findIndex(
            (a) => a.componentId === comp.id && a.status !== 'resolved'
          );

          if (sev === StockSeverity.Healthy) {
            // Auto-resolve open alert if bin has been replenished to healthy runtime
            if (openIdx !== -1) {
              updated[openIdx] = {
                ...updated[openIdx],
                status: 'resolved',
                resolvedAt: nowIso,
              };
              changed = true;
            }
          } else {
            const severityRank: Record<StockSeverity, number> = {
              [StockSeverity.Healthy]: 0,
              [StockSeverity.Warning]: 1,
              [StockSeverity.Critical]: 2,
              [StockSeverity.StockOut]: 3,
            };

            if (openIdx === -1) {
              // Create new early-warning alert
              const branchObj = branches.find((b) => b.id === comp.branchId);
              const wsObj = branchObj?.workstations.find(
                (w) => w.id === comp.workstationId
              );
              const channels: string[] = [];
              if (currentSettings.dashboardBannerEnabled)
                channels.push('Dashboard');
              if (currentSettings.emailEnabled) channels.push('Email');
              if (
                currentSettings.smsEnabled &&
                (sev === StockSeverity.Critical ||
                  sev === StockSeverity.StockOut)
              ) {
                channels.push('SMS');
              }

              const newAlert: AlertItem = {
                id: `ALT-${Math.floor(1000 + Math.random() * 8999)}`,
                componentId: comp.id,
                componentName: comp.name,
                branchId: comp.branchId,
                branchName: branchObj?.code ?? comp.branchId,
                workstationId: comp.workstationId,
                workstationName: wsObj
                  ? `${wsObj.code} · ${wsObj.name}`
                  : comp.workstationId,
                severity: sev,
                hoursRemainingAtTrigger: hoursLeft,
                quantityAtTrigger: comp.currentQty,
                status: 'active',
                createdAt: nowIso,
                channelsDispatched:
                  channels.length > 0 ? channels : ['Dashboard'],
              };

              updated = [newAlert, ...updated];
              changed = true;

              if (
                sev === StockSeverity.Critical ||
                sev === StockSeverity.StockOut
              ) {
                triggeredNewCritical = true;
                if (currentSettings.smsEnabled) {
                  newLogs.push({
                    id: `DSP-${Date.now()}-${comp.id}`,
                    channel: 'SMS',
                    recipient: currentSettings.smsRecipient,
                    message: `[${sev.toUpperCase()}] ${comp.workstationId} ${
                      comp.name
                    } at ${formatHoursRemaining(hoursLeft)} left (${Math.round(
                      comp.currentQty
                    )} ${comp.unit}).`,
                    timestamp: nowIso,
                  });
                }
              } else if (currentSettings.emailEnabled) {
                newLogs.push({
                  id: `DSP-${Date.now()}-${comp.id}`,
                  channel: 'Email',
                  recipient: currentSettings.emailRecipient,
                  message: `[WARNING] ${comp.workstationId} ${
                    comp.name
                  } entered <${
                    currentSettings.warningHoursThreshold
                  }h window (${formatHoursRemaining(hoursLeft)} left).`,
                  timestamp: nowIso,
                });
              }
            } else {
              // Escalate existing open alert if severity worsened (e.g. Warning -> Critical -> StockOut)
              const existing = updated[openIdx];
              if (severityRank[sev] > severityRank[existing.severity]) {
                updated[openIdx] = {
                  ...existing,
                  severity: sev,
                  hoursRemainingAtTrigger: hoursLeft,
                  quantityAtTrigger: comp.currentQty,
                  status: 'active',
                  createdAt: nowIso,
                };
                changed = true;
                if (
                  sev === StockSeverity.Critical ||
                  sev === StockSeverity.StockOut
                ) {
                  triggeredNewCritical = true;
                }
              }
            }
          }
        });

        return changed ? updated.slice(0, 60) : prevAlerts;
      });

      // Auto-generate Purchase Requests when stock hits or falls below reorderLevel
      setPurchaseRequests((prevPOs) => {
        let nextPOs = [...prevPOs];
        let poAdded = false;

        nextComponents.forEach((comp) => {
          if (comp.currentQty <= comp.reorderLevel) {
            const hasOpenPo = nextPOs.some(
              (po) =>
                po.componentId === comp.id && po.status !== 'received'
            );
            if (!hasOpenPo) {
              const recQty = calculateRecommendedReorderQty(comp);
              const poId = `PO-2026-${Math.floor(4200 + Math.random() * 5700)}`;
              nextPOs = [
                {
                  id: poId,
                  componentId: comp.id,
                  componentName: comp.name,
                  branchId: comp.branchId,
                  workstationId: comp.workstationId,
                  supplier: comp.supplier,
                  recommendedQty: recQty,
                  leadTimeHours: comp.leadTimeHours,
                  status: 'pending_approval',
                  createdAt: nowIso,
                  triggerReason: `Auto-triggered at ${Math.round(
                    comp.currentQty
                  )} ${comp.unit} (≤ reorder ${comp.reorderLevel})`,
                },
                ...nextPOs,
              ];
              poAdded = true;

              if (currentSettings.emailEnabled) {
                newLogs.push({
                  id: `DSP-PO-${Date.now()}-${comp.id}`,
                  channel: 'Email',
                  recipient: currentSettings.emailRecipient,
                  message: `Auto-PO ${poId} generated for ${recQty} ${comp.unit} of ${comp.name} (${comp.supplier}).`,
                  timestamp: nowIso,
                });
              }
            }
          }
        });

        return poAdded ? nextPOs.slice(0, 40) : prevPOs;
      });

      if (newLogs.length > 0) {
        setDispatchLogs((prev) => [...newLogs, ...prev].slice(0, 40));
      }

      if (triggeredNewCritical) {
        setBannerFlashKey((k) => k + 1);
        if (currentSettings.audioChimeEnabled) {
          playCriticalAlertChime();
        }
      }
    },
    [branches]
  );

  /**
   * Applies simulated production line consumption for a given fraction of an hour.
   */
  const applySimulatedHours = useCallback(
    (hoursElapsed: number) => {
      setComponents((prev) => {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const next = prev.map((comp) => {
          const consumed = comp.consumptionRatePerHour * hoursElapsed;
          // Add slight +/-8% shop-floor variance for realism
          const varianceFactor = 0.92 + Math.random() * 0.16;
          const nextQty = Math.max(
            0,
            Math.round((comp.currentQty - consumed * varianceFactor) * 10) / 10
          );

          const nextHistory = [
            ...comp.history.slice(-7),
            {
              timeLabel,
              timestamp: now.toISOString(),
              quantity: nextQty,
            },
          ];

          return {
            ...comp,
            currentQty: nextQty,
            lastUpdated: now.toISOString(),
            history: nextHistory,
          };
        });

        // Schedule warning evaluation outside pure state reducer
        window.setTimeout(() => reconcileEarlyWarnings(next), 0);
        return next;
      });
    },
    [reconcileEarlyWarnings]
  );

  // Live 3-second sensor simulation loop (3s tick = 3 minutes = 0.05 production hours)
  useEffect(() => {
    if (!isSimulating) return;
    const timer = window.setInterval(() => {
      applySimulatedHours(0.05);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isSimulating, applySimulatedHours]);

  // Handlers
  const handleSimulateBurst = () => {
    // Advance 30 minutes (0.5 hours) of production line consumption immediately
    applySimulatedHours(0.5);
  };

  const handleRefillComponent = (componentId: string) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setComponents((prev) => {
      const next = prev.map((c) => {
        if (c.id !== componentId) return c;
        return {
          ...c,
          currentQty: c.maxCapacity,
          lastUpdated: now.toISOString(),
          history: [
            ...c.history.slice(-7),
            {
              timeLabel,
              timestamp: now.toISOString(),
              quantity: c.maxCapacity,
            },
          ],
        };
      });
      window.setTimeout(() => reconcileEarlyWarnings(next), 0);
      return next;
    });
  };

  const handleRefillAtRisk = () => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setComponents((prev) => {
      const next = prev.map((c) => {
        const sev = evaluateStockSeverity(c, settings);
        if (sev === StockSeverity.Healthy) return c;
        return {
          ...c,
          currentQty: c.maxCapacity,
          lastUpdated: now.toISOString(),
          history: [
            ...c.history.slice(-7),
            {
              timeLabel,
              timestamp: now.toISOString(),
              quantity: c.maxCapacity,
            },
          ],
        };
      });
      window.setTimeout(() => reconcileEarlyWarnings(next), 0);
      return next;
    });
  };

  const handleAdjustQuantity = (
    componentId: string,
    delta: number,
    _reason: string
  ) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setComponents((prev) => {
      const next = prev.map((c) => {
        if (c.id !== componentId) return c;
        const newQty = Math.min(
          c.maxCapacity,
          Math.max(0, Math.round((c.currentQty + delta) * 10) / 10)
        );
        return {
          ...c,
          currentQty: newQty,
          lastUpdated: now.toISOString(),
          history: [
            ...c.history.slice(-7),
            {
              timeLabel,
              timestamp: now.toISOString(),
              quantity: newQty,
            },
          ],
        };
      });
      window.setTimeout(() => reconcileEarlyWarnings(next), 0);
      return next;
    });
  };

  const handleBarcodeScanUpdate = (
    codeOrId: string,
    delta: number
  ): { ok: boolean; message: string } => {
    const normalized = codeOrId.trim().toUpperCase();
    const target = components.find(
      (c) =>
        c.barcode.toUpperCase() === normalized ||
        c.id.toUpperCase() === normalized
    );

    if (!target) {
      return {
        ok: false,
        message: `Unrecognized barcode or SKU "${normalized}". Try SCN-BLT-101 or CMP-301.`,
      };
    }

    handleAdjustQuantity(target.id, delta, 'Barcode scan');
    const nextEst = Math.min(
      target.maxCapacity,
      Math.max(0, Math.round(target.currentQty + delta))
    );
    return {
      ok: true,
      message: `Scan recorded for ${target.id} (${target.name}) at ${target.workstationId}: ${
        delta > 0 ? `+${delta}` : delta
      } ${target.unit} → ${nextEst} ${target.unit}.`,
    };
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    const actorLabel =
      role === UserRole.Admin
        ? 'Admin'
        : role === UserRole.Supervisor
        ? 'Supervisor'
        : 'Operator';
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: 'acknowledged', acknowledgedBy: actorLabel }
          : a
      )
    );
  };

  const handleResolveAndRefillAlert = (alertId: string) => {
    const targetAlert = alerts.find((a) => a.id === alertId);
    if (targetAlert) {
      handleRefillComponent(targetAlert.componentId);
    }
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const handleApprovePurchaseOrder = (poId: string) => {
    const po = purchaseRequests.find((p) => p.id === poId);
    if (!po) return;
    handleAdjustQuantity(po.componentId, po.recommendedQty, `PO ${poId}`);
    setPurchaseRequests((prev) =>
      prev.map((p) => (p.id === poId ? { ...p, status: 'received' } : p))
    );
  };

  const handleSaveComponent = (
    itemData: Omit<ComponentItem, 'lastUpdated' | 'history'>,
    isEdit: boolean
  ) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setComponents((prev) => {
      let next: ComponentItem[];
      if (isEdit) {
        next = prev.map((c) =>
          c.id === itemData.id
            ? {
                ...c,
                ...itemData,
                lastUpdated: now.toISOString(),
                history: [
                  ...c.history.slice(-7),
                  {
                    timeLabel,
                    timestamp: now.toISOString(),
                    quantity: itemData.currentQty,
                  },
                ],
              }
            : c
        );
      } else {
        const newComp: ComponentItem = {
          ...itemData,
          lastUpdated: now.toISOString(),
          history: [
            {
              timeLabel: '-1.0h',
              timestamp: new Date(now.getTime() - 3600000).toISOString(),
              quantity: Math.min(
                itemData.maxCapacity,
                itemData.currentQty + itemData.consumptionRatePerHour
              ),
            },
            {
              timeLabel,
              timestamp: now.toISOString(),
              quantity: itemData.currentQty,
            },
          ],
        };
        next = [newComp, ...prev];
      }
      window.setTimeout(() => reconcileEarlyWarnings(next), 0);
      return next;
    });
  };

  const handleDeleteComponent = (componentId: string) => {
    if (role !== UserRole.Admin) return;
    setComponents((prev) => prev.filter((c) => c.id !== componentId));
    setAlerts((prev) => prev.filter((a) => a.componentId !== componentId));
  };

  const handleSimulateIotWebhook = ({
    sensorType,
    componentId,
    reportedQty,
  }: {
    sensorType: 'load_cell' | 'rfid_gate';
    componentId: string;
    reportedQty: number;
  }) => {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setComponents((prev) => {
      const next = prev.map((c) =>
        c.id === componentId
          ? {
              ...c,
              currentQty: Math.min(c.maxCapacity, reportedQty),
              lastUpdated: now.toISOString(),
              history: [
                ...c.history.slice(-7),
                {
                  timeLabel,
                  timestamp: now.toISOString(),
                  quantity: Math.min(c.maxCapacity, reportedQty),
                },
              ],
            }
          : c
      );
      window.setTimeout(() => reconcileEarlyWarnings(next), 0);
      return next;
    });

    setDispatchLogs((prev) => [
      {
        id: `DSP-IOT-${Date.now()}`,
        channel: 'IoT Webhook',
        recipient: 'POST /api/v1/telemetry/stock-event',
        message: `${
          sensorType === 'load_cell' ? 'Load-Cell Scale' : 'UHF RFID Gate'
        } updated ${componentId} net quantity to ${reportedQty} units.`,
        timestamp: now.toISOString(),
      },
      ...prev.slice(0, 39),
    ]);
  };

  const handleResetFactoryData = () => {
    Object.values(STORAGE_KEYS).forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
    setComponents(INITIAL_COMPONENTS);
    setAlerts(INITIAL_ALERTS);
    setPurchaseRequests(INITIAL_PURCHASE_REQUESTS);
    setDispatchLogs(INITIAL_DISPATCH_LOGS);
    setSettings(INITIAL_NOTIFICATION_SETTINGS);
  };

  // Critical banner & open alert counters
  const criticalComponents = useMemo(() => {
    return components
      .filter((c) => {
        const sev = evaluateStockSeverity(c, settings);
        return (
          sev === StockSeverity.Critical || sev === StockSeverity.StockOut
        );
      })
      .sort(
        (a, b) =>
          calculateTimeToStockout(a.currentQty, a.consumptionRatePerHour) -
          calculateTimeToStockout(b.currentQty, b.consumptionRatePerHour)
      );
  }, [components, settings]);

  const unacknowledgedAlertsCount = useMemo(
    () => alerts.filter((a) => a.status === 'active').length,
    [alerts]
  );

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'branches', label: t.nav.branches, icon: GitBranch },
    {
      id: 'alerts',
      label: t.nav.alerts,
      icon: AlertTriangle,
      count: unacknowledgedAlertsCount,
    },
    { id: 'components', label: t.nav.components, icon: Boxes },
    { id: 'reports', label: t.nav.reports, icon: BarChart3 },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const currentTabTitle =
    navItems.find((n) => n.id === activeTab)?.label ?? t.nav.dashboard;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 font-display whitespace-nowrap shrink-0"
          >
            {t.appName}
          </button>
        </div>

        <nav
          className="flex-1 px-3 py-5 space-y-1 overflow-y-auto"
          aria-label="Sidebar navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== 'branches') {
                    setHighlightedWorkstationId(null);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`font-mono tabular-nums text-xs font-bold ${
                      isActive
                        ? 'text-amber-300 dark:text-red-600'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Utility Controls: Role, Language, Dark/Light Theme */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
          <div>
            <label
              htmlFor="sidebar-role-select"
              className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              Active Plant Role
            </label>
            <select
              id="sidebar-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value={UserRole.Admin}>{t.roles.admin} (Full Access)</option>
              <option value={UserRole.Supervisor}>
                {t.roles.supervisor} (Line Lead)
              </option>
              <option value={UserRole.Operator}>
                {t.roles.operator} (Shop Floor)
              </option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700"
              role="group"
              aria-label="Select interface language"
            >
              {(['en', 'ta', 'hi'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md uppercase transition-colors whitespace-nowrap ${
                    language === code
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {code === 'en' ? 'EN' : code === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={
                darkMode ? 'Switch to light theme' : 'Switch to dark theme'
              }
              title={darkMode ? 'Light mode' : 'Dark mode'}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="text-lg font-bold font-display text-slate-900 dark:text-slate-50">
                {t.appName}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg ${
                      isActive
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="font-mono text-xs font-bold text-red-500">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                {(['en', 'ta', 'hi'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md border ${
                      language === code
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {code === 'en' ? 'EN' : code === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDarkMode((d) => !d)}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-700"
                  aria-label="Toggle theme"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Notification Bell + Primary Live Feed Action on Right */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                {t.plantSubtitle}
              </span>
              <span
                aria-hidden="true"
                className="text-slate-300 dark:text-slate-700 hidden sm:inline"
              >
                /
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentTabTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              aria-label={`Active alerts: ${unacknowledgedAlertsCount}`}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                {unacknowledgedAlertsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsSimulating((s) => !s)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isSimulating
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.actions.pauseFeed}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.actions.resumeFeed}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Prominent Critical / Stock-out Early Warning Banner */}
        {settings.dashboardBannerEnabled && criticalComponents.length > 0 && (
          <div
            key={bannerFlashKey}
            role="alert"
            className="mx-4 sm:mx-8 mt-5 rounded-xl border border-red-300 dark:border-red-900/80 bg-red-50/90 dark:bg-red-950/40 px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-critical-flash"
          >
            <div className="flex items-start sm:items-center gap-3">
              <OctagonAlert
                className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0"
                aria-hidden="true"
              />
              <div className="text-sm">
                <span className="font-bold text-red-900 dark:text-red-200">
                  Line Stoppage Risk ({criticalComponents.length}{' '}
                  {criticalComponents.length === 1 ? 'Workstation' : 'Workstations'}):
                </span>{' '}
                <span className="text-red-800 dark:text-red-300">
                  {criticalComponents[0].workstationId} ·{' '}
                  {criticalComponents[0].name} has{' '}
                  <strong className="font-mono tabular-nums">
                    {formatHoursRemaining(
                      calculateTimeToStockout(
                        criticalComponents[0].currentQty,
                        criticalComponents[0].consumptionRatePerHour
                      )
                    )}
                  </strong>{' '}
                  left ({Math.round(criticalComponents[0].currentQty)}{' '}
                  {criticalComponents[0].unit}).
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Alerts
              </button>
              <button
                type="button"
                onClick={handleRefillAtRisk}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Refill Critical Bins</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Workspace Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              branches={branches}
              components={components}
              alerts={alerts}
              purchaseRequests={purchaseRequests}
              settings={settings}
              role={role}
              t={t}
              onSimulateBurst={handleSimulateBurst}
              onRefillAtRisk={handleRefillAtRisk}
              onRefillComponent={handleRefillComponent}
              onOpenAddModal={() => {
                setEditingComponent(null);
                setModalOpen(true);
              }}
              onApprovePurchaseOrder={handleApprovePurchaseOrder}
              onNavigateToBranchWorkstation={(branchId, wsId) => {
                setSelectedBranchId(branchId);
                setHighlightedWorkstationId(wsId);
                setActiveTab('branches');
              }}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesView
              branches={branches}
              components={components}
              settings={settings}
              selectedBranchId={selectedBranchId}
              highlightedWorkstationId={highlightedWorkstationId}
              t={t}
              onSelectBranch={(bId) => {
                setSelectedBranchId(bId);
                setHighlightedWorkstationId(null);
              }}
              onAdjustQuantity={handleAdjustQuantity}
              onRefillComponent={handleRefillComponent}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              dispatchLogs={dispatchLogs}
              settings={settings}
              role={role}
              t={t}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onResolveAndRefillAlert={handleResolveAndRefillAlert}
              onUpdateSettings={(partial) =>
                setSettings((prev) => ({ ...prev, ...partial }))
              }
            />
          )}

          {activeTab === 'components' && (
            <ComponentsView
              branches={branches}
              components={components}
              settings={settings}
              role={role}
              t={t}
              onOpenAddModal={() => {
                setEditingComponent(null);
                setModalOpen(true);
              }}
              onOpenEditModal={(item) => {
                setEditingComponent(item);
                setModalOpen(true);
              }}
              onDeleteComponent={handleDeleteComponent}
              onBarcodeScanUpdate={handleBarcodeScanUpdate}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              branches={branches}
              components={components}
              alerts={alerts}
              settings={settings}
              t={t}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              components={components}
              settings={settings}
              role={role}
              language={language}
              darkMode={darkMode}
              onChangeRole={setRole}
              onChangeLanguage={setLanguage}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
              onUpdateSettings={(partial) =>
                setSettings((prev) => ({ ...prev, ...partial }))
              }
              onSimulateIotWebhook={handleSimulateIotWebhook}
              onResetFactoryData={handleResetFactoryData}
            />
          )}
        </main>

        {/* Quiet Operational Footer (No fake telemetry tickers) */}
        <footer className="px-4 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            StockSentinel Production Line Early Warning System · Local browser storage persistence enabled
          </span>
          <span>
            {isSimulating ? t.sections.liveFeedRunning : t.sections.liveFeedPaused}
          </span>
        </footer>
      </div>

      {/* Add / Edit Component Modal */}
      <ComponentModal
        isOpen={modalOpen}
        editingComponent={editingComponent}
        branches={branches}
        existingIds={components.map((c) => c.id)}
        onClose={() => {
          setModalOpen(false);
          setEditingComponent(null);
        }}
        onSave={handleSaveComponent}
      />
    </div>
  );
}
