# StockSentinel: Production Line Component Early Warning System

StockSentinel is a responsive, client-side industrial inventory monitoring and early-warning web application built with React, TypeScript, Tailwind CSS, and Recharts. All operational state persists locally in `localStorage` so shop-floor teams can simulate, inspect, and test production line protection without requiring an external database.

## How the Early-Warning Engine Works

### 1. Time-to-Stockout Calculation
Instead of relying solely on static unit counts—which fail when high-speed workstations consume fasteners or terminals much faster than slow sub-assemblies—StockSentinel normalizes inventory into **hours of remaining runtime**:

```
Time-to-Stockout (hours) = Current Quantity / Consumption Rate (units per hour)
```

For example:
- **M8 Hex Flange Bolts** with `95` units left at a consumption rate of `120 units/hr` yields **0.79 hours (47 minutes)** of runtime -> **Critical**.
- **Brushless Servo Motors** with `18` units left at a consumption rate of `3 units/hr` yields **6.00 hours** of runtime -> **Healthy**.

### 2. Multi-Stage Alert Thresholds
Every tick of the sensor feed (or manual barcode scan / IoT webhook update) evaluates each workstation component against four deterministic states:

| State | Rule (Default Configurable Thresholds) | Operational Action |
| :--- | :--- | :--- |
| **Stock-out** | `Current Quantity <= 0` | Line stoppage imminent/active; triggers high-priority banner, chime, and emergency refill workflow. |
| **Critical** | `0 < Time-to-Stockout < 1.0 hour` | Triggers prominent workspace alert banner, audio/visual flash, notification bell increment, and SMS/Email dispatch simulation. |
| **Warning (Low)** | `1.0 hour <= Time-to-Stockout < 4.0 hours` | Logs early warning alert so material handlers can stage replenishment bins before interruption. |
| **Healthy** | `Time-to-Stockout >= 4.0 hours` | Nominal operation across the workstation. |

### 3. Predictive Reorder & Auto-Generated Purchase Requests
When a component's `Current Quantity` reaches or drops below its `Reorder Level`:
1. StockSentinel calculates the **Recommended Reorder Quantity** using supplier lead time and a 25% safety buffer:
   ```
   Recommended Qty = max(Max Capacity - Current Qty, ceil(Consumption Rate * Lead Time Hours * 1.25))
   ```
2. If no open Purchase Request exists for that component, an **Auto-Generated Purchase Request (`PO-2026-XXXX`)** is created automatically for Supervisor/Admin approval.

### 4. Live Sensor & IoT Webhook Simulation
- **Continuous Simulation**: Every 3 seconds, active workstations decrement stock proportionally to their hourly consumption rate (`rate * 0.05` hours = 3 simulated production minutes per tick) and append telemetry to each component's time-series history.
- **Barcode / QR Station**: Shop-floor operators can scan or enter SKU codes to log immediate bin refills or kitting pulls.
- **IoT REST Contract**: The Settings view documents and simulates `POST /api/v1/telemetry/stock-event` payloads from RS-485 load-cell bin scales and UHF RFID Kanban readers.
