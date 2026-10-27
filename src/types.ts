export enum StockSeverity {
  Healthy = 'healthy',
  Warning = 'warning',
  Critical = 'critical',
  StockOut = 'stockout',
}

export enum UserRole {
  Operator = 'operator',
  Supervisor = 'supervisor',
  Admin = 'admin',
}

export type LanguageCode = 'en' | 'ta' | 'hi';

export type NavTab =
  | 'dashboard'
  | 'branches'
  | 'alerts'
  | 'components'
  | 'reports'
  | 'settings';

export interface StockHistoryPoint {
  timeLabel: string;
  timestamp: string;
  quantity: number;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  shiftLead: string;
  workstations: Workstation[];
}

export interface Workstation {
  id: string;
  code: string;
  name: string;
  branchId: string;
  sensorType: 'Load-Cell Scale' | 'UHF RFID Gate' | 'Optical Bin Counter';
}

export interface ComponentItem {
  id: string; // e.g. CMP-101
  barcode: string; // e.g. SCN-BLT-101
  name: string;
  category: string;
  branchId: string;
  workstationId: string;
  currentQty: number;
  maxCapacity: number;
  minThreshold: number;
  reorderLevel: number;
  consumptionRatePerHour: number; // units consumed per production hour
  unit: string;
  supplier: string;
  leadTimeHours: number;
  lastUpdated: string;
  history: StockHistoryPoint[];
}

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertItem {
  id: string;
  componentId: string;
  componentName: string;
  branchId: string;
  branchName: string;
  workstationId: string;
  workstationName: string;
  severity: StockSeverity.Warning | StockSeverity.Critical | StockSeverity.StockOut;
  hoursRemainingAtTrigger: number;
  quantityAtTrigger: number;
  status: AlertStatus;
  createdAt: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  channelsDispatched: string[];
}

export interface PurchaseRequest {
  id: string;
  componentId: string;
  componentName: string;
  branchId: string;
  workstationId: string;
  supplier: string;
  recommendedQty: number;
  leadTimeHours: number;
  status: 'pending_approval' | 'ordered' | 'received';
  createdAt: string;
  triggerReason: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailRecipient: string;
  smsEnabled: boolean;
  smsRecipient: string;
  dashboardBannerEnabled: boolean;
  audioChimeEnabled: boolean;
  warningHoursThreshold: number; // default 4 hours
  criticalHoursThreshold: number; // default 1 hour
}

export interface DispatchLogEntry {
  id: string;
  channel: 'Email' | 'SMS' | 'Dashboard' | 'IoT Webhook';
  recipient: string;
  message: string;
  timestamp: string;
}
