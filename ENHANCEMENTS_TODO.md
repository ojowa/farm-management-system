# Farm Management System — Enhancement Implementation Plan

> Detailed task list for transforming the admin frontend from a CRUD shell into a
> production-grade farm management platform.

---

## Priority 1: Foundation (High Impact — Do First)

### 1.1 Install & Configure Charting Library

- [ ] Install `recharts` package in `apps/admin`
- [ ] Create `src/components/charts/` directory with reusable chart wrappers:
  - [ ] `LineChart.tsx` — for trends over time (production, financial)
  - [ ] `BarChart.tsx` — for comparisons (farm performance, category breakdown)
  - [ ] `PieChart.tsx` — for distributions (farm types, expense categories)
  - [ ] `AreaChart.tsx` — for cumulative data (revenue, inventory levels)
- [ ] Create `src/components/charts/ChartCard.tsx` — card wrapper with title, time-range selector, loading state, empty state
- [ ] Create `src/components/charts/NoData.tsx` — placeholder when chart has no data
- [ ] Add chart theme colors to match the app's light/dark theme system

### 1.2 Dashboard Rewrite

- [ ] **Stats cards** — keep current 4 cards (Farms, Crops, Livestock, Poultry) but add:
  - [ ] Total Workers count
  - [ ] Active Inventory Items count
  - [ ] Monthly Revenue (current month vs previous month with % change)
  - [ ] Monthly Expenses (current month vs previous month with % change)
- [ ] **Production Overview chart** — replace placeholder with real line chart:
  - [ ] X-axis: last 12 months
  - [ ] Lines: crop harvest count, livestock sold count, poultry eggs produced
  - [ ] Fetch from `GET /reports/analytics/production?period=12m`
- [ ] **Financial Summary chart** — replace placeholder with real area chart:
  - [ ] X-axis: last 12 months
  - [ ] Areas: income (green), expenses (red), net profit (blue)
  - [ ] Fetch from `GET /reports/analytics/financial?period=12m`
- [ ] **Recent Activity feed** — replace hardcoded data with real activity log:
  - [ ] Fetch from `GET /notifications?limit=10` or a dedicated activity endpoint
  - [ ] Show entity type icon, action (created/updated/deleted), user, timestamp
  - [ ] Relative time display (e.g., "2 hours ago")
- [ ] **Alerts panel** — replace hardcoded alerts with real data:
  - [ ] Low inventory items (quantity < reorder threshold)
  - [ ] Upcoming vaccination schedules (poultry)
  - [ ] Livestock without recent health checks
  - [ ] Overdue tasks
- [ ] **Quick Actions** — keep existing but add:
  - [ ] "Record Expense" direct link
  - [ ] "Log Feeding" direct link (poultry)
  - [ ] "Clock In" direct link (when attendance is implemented)

### 1.3 Task Management Module

- [ ] **Backend** — create `services/task-service/`:
  - [ ] `src/main.ts` — Express server on port 40XX
  - [ ] `src/models/task.model.ts` — Prisma schema: `Task { id, title, description, priority, status, dueDate, assignedTo, farmId, cropId, livestockId, poultryFlockId, createdBy, createdAt, updatedAt }`
  - [ ] Priority enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
  - [ ] Status enum: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `OVERDUE`
  - [ ] `src/routes/task.routes.ts` — CRUD + bulk status update
  - [ ] `src/middleware/auth.ts` — JWT verification + permission checks (`task.read`, `task.write`, `task.delete`)
  - [ ] Prisma migration + seed data
  - [ ] Add to `pnpm-workspace.yaml`
  - [ ] Add `@farm/task-service` to gateway proxy routes
- [ ] **Frontend** — `apps/admin/src/app/(app)/tasks/`:
  - [ ] `page.tsx` — Task list with columns (Kanban-style board or table view toggle)
  - [ ] `new/page.tsx` — Create task form (title, description, priority, assignee, due date, linked farm/crop/livestock)
  - [ ] `[id]/page.tsx` — Task detail with status timeline, comments
  - [ ] `[id]/edit/page.tsx` — Edit task
  - [ ] Board view component with drag-and-drop columns (Pending → In Progress → Completed)
  - [ ] Calendar view showing tasks by due date
- [ ] **Sidebar** — add "Tasks" nav item between Workers and Finance:
  - [ ] Icon: `ListTodo` from Lucide
  - [ ] Required module: `task`
  - [ ] Required permission: `task.read`
- [ ] **Dashboard integration** — add "Overdue Tasks" card to alerts panel
- [ ] **API layer** — add `tasksAPI` to `src/lib/api.ts`

### 1.4 Worker Attendance & Time Tracking

- [ ] **Backend** — extend `services/hr-service/`:
  - [ ] Prisma schema addition: `Attendance { id, workerId, clockIn, clockOut, date, status, notes, createdAt }`
  - [ ] Status enum: `PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `ON_LEAVE`
  - [ ] `GET /attendance?workerId=&date=&startDate=&endDate=` — list with filters
  - [ ] `POST /attendance/clock-in` — record clock-in (auto-detect late based on configurable shift start)
  - [ ] `POST /attendance/clock-out` — record clock-out, calculate hours worked
  - [ ] `GET /attendance/summary?workerId=&month=&year=` — monthly summary (days present, absent, late, total hours)
  - [ ] `POST /attendance/bulk` — bulk record for days missed
  - [ ] Permission gates: `worker.read` for view, `worker.write` for clock-in/out, `worker.manage` for admin editing
- [ ] **Frontend** — `apps/admin/src/app/(app)/workers/attendance/`:
  - [ ] `page.tsx` — Attendance dashboard:
    - [ ] Today's attendance summary card (present/absent/late counts)
    - [ ] Worker attendance table with clock-in/out buttons
    - [ ] Date picker to view historical attendance
  - [ ] `[workerId]/page.tsx` — Individual worker attendance history:
    - [ ] Monthly calendar view with color-coded days
    - [ ] Summary stats (attendance rate, average hours, total late days)
    - [ ] Table of all records
  - [ ] Reports sub-page with exportable monthly attendance sheets
- [ ] **Worker detail page** — add "Attendance" tab to `workers/[id]/page.tsx`
- [ ] **Dashboard** — add "Today's Attendance" mini-card
- [ ] **API layer** — add `attendanceAPI` to `src/lib/api.ts`

### 1.5 Make Settings Functional

- [ ] **Profile settings** — connect save handler to `PUT /auth/profile`:
  - [ ] Name, email, phone updates
  - [ ] Avatar upload to `POST /auth/avatar` (or file storage service)
- [ ] **Organization settings** — connect save handler to `PUT /organizations/{id}`:
  - [ ] Name, logo, timezone, currency, date format
- [ ] **Notification settings** — connect save handler to `PUT /notifications/preferences`:
  - [ ] Delivery channels (email, push, in-app) per notification type
  - [ ] Alert type toggles
- [ ] **Security settings**:
  - [ ] Change password → `POST /auth/change-password`
  - [ ] 2FA enable/disable → `POST /auth/mfa/toggle`
- [ ] **Integrations settings**:
  - [ ] API key CRUD → `POST/GET/DELETE /integrations/api-keys`
  - [ ] Connected services list

---

## Priority 2: Operational Depth (Differentiation)

### 2.1 Crop Calendar & Lifecycle

- [ ] **Backend** — extend `services/crop-service/`:
  - [ ] Prisma schema addition: `CropStage { id, cropId, stage, startDate, endDate, notes, createdAt }`
  - [ ] Stage enum: `PREPARATION`, `PLANTING`, `GERMINATION`, `GROWING`, `FLOWERING`, `FRUITING`, `HARVESTING`, `POST_HARVEST`
  - [ ] `POST /crops/{id}/stages` — add stage record
  - [ ] `GET /crops/{id}/stages` — get stage history
  - [ ] `PUT /crops/{id}/stages/{stageId}` — update stage (add end date, notes)
  - [ ] `GET /crops/calendar?farmId=&year=&month=` — calendar view data (stages spanning date ranges)
- [ ] **Frontend** — `apps/admin/src/app/(app)/crops/calendar/`:
  - [ ] `page.tsx` — Monthly/weekly calendar view:
    - [ ] Crop stages displayed as colored bars across dates
    - [ ] Filter by farm, crop type
    - [ ] Click stage bar to see details/edit
    - [ ] Today marker line
  - [ ] Side panel showing upcoming stages (next 7 days)
- [ ] **Crop detail page** — add "Lifecycle" tab:
  - [ ] Visual timeline of stages with dates
  - [ ] Add/edit stage form
  - [ ] Current stage highlighted
- [ ] **API layer** — add `cropStagesAPI` to `src/lib/api.ts`

### 2.2 Livestock Health Records

- [ ] **Backend** — extend `services/livestock-service/`:
  - [ ] Prisma schema addition: `HealthRecord { id, livestockId, type, date, description, veterinarian, medications, cost, nextCheckupDate, createdAt }`
  - [ ] Type enum: `VACCINATION`, `TREATMENT`, `CHECKUP`, `SURGERY`, `DEWORMING`, `OTHER`
  - [ ] Prisma schema addition: `VaccinationSchedule { id, livestockId, vaccineName, scheduledDate, administeredDate, status, notes }`
  - [ ] `GET /livestock/{id}/health` — health history
  - [ ] `POST /livestock/{id}/health` — add health record
  - [ ] `GET /livestock/{id}/vaccinations` — vaccination schedule
  - [ ] `POST /livestock/{id}/vaccinations` — schedule vaccination
  - [ ] `PUT /livestock/{id}/vaccinations/{vacId}` — mark as administered
  - [ ] `GET /livestock/health/overdue` — animals with overdue vaccinations
- [ ] **Frontend** — extend `apps/admin/src/app/(app)/livestock/[id]/`:
  - [ ] Add "Health" tab to livestock detail page:
    - [ ] Health records table (date, type, description, vet, cost)
    - [ ] Add health record dialog
    - [ ] Vaccination schedule table with status badges
    - [ ] Schedule vaccination dialog
    - [ ] Upcoming vaccinations card
  - [ ] New `livestock/health/page.tsx` — health overview:
    - [ ] Animals due for vaccination this week
    - [ ] Recent health records across all livestock
    - [ ] Health cost summary by month
- [ ] **Sidebar** — add "Health" sub-item under Livestock
- [ ] **Dashboard** — add "Upcoming Vaccinations" card to alerts

### 2.3 Livestock Breeding Records

- [ ] **Backend** — extend `services/livestock-service/`:
  - [ ] Prisma schema: `BreedingRecord { id, sireId, damId, breedingDate, expectedDueDate, actualBirthDate, offspringCount, status, notes }`
  - [ ] Status enum: `PLANNED`, `BRED`, `CONFIRMED`, `BORN`, `FAILED`
  - [ ] `GET /livestock/breeding` — list breeding records
  - [ ] `POST /livestock/breeding` — create breeding record
  - [ ] `PUT /livestock/breeding/{id}` — update (confirm pregnancy, record birth)
  - [ ] `GET /livestock/breeding/upcoming` — upcoming due dates
- [ ] **Frontend** — `apps/admin/src/app/(app)/livestock/breeding/`:
  - [ ] `page.tsx` — Breeding records list with status filters
  - [ ] `new/page.tsx` — Create breeding record (select sire/dam, date, expected due)
  - [ ] `[id]/page.tsx` — Breeding detail with timeline
- [ ] **Livestock detail page** — add "Breeding" tab showing animal's breeding history

### 2.4 Weight/Growth Tracking

- [ ] **Backend** — extend `services/livestock-service/`:
  - [ ] Prisma schema: `WeightRecord { id, livestockId, weight, unit, recordedDate, notes }`
  - [ ] `GET /livestock/{id}/weights` — weight history
  - [ ] `POST /livestock/{id}/weights` — record weight
  - [ ] `GET /livestock/{id}/weights/chart` — chart data (weight over time)
  - [ ] Same for poultry flocks: `GET /poultry/flocks/{id}/weights`
- [ ] **Frontend** — add "Weight" tab to livestock/poultry detail pages:
  - [ ] Weight history table
  - [ ] Line chart showing weight over time
  - [ ] Add weight record dialog
  - [ ] Growth rate calculation (weight gain per day/week)

### 2.5 Irrigation Scheduling

- [ ] **Backend** — new module in `services/crop-service/` or new `services/irrigation-service/`:
  - [ ] Prisma schema: `IrrigationSchedule { id, cropId, farmId, frequency, waterAmount, unit, startDate, endDate, isActive, lastRun, nextRun }`
  - [ ] Prisma schema: `IrrigationLog { id, scheduleId, cropId, date, duration, waterAmount, notes, recordedBy }`
  - [ ] CRUD for schedules + logs
  - [ ] `GET /irrigation/schedule?farmId=` — active schedules
  - [ ] `POST /irrigation/log` — record irrigation event
- [ ] **Frontend** — `apps/admin/src/app/(app)/irrigation/`:
  - [ ] `page.tsx` — Irrigation dashboard (active schedules, upcoming runs, water usage summary)
  - [ ] `schedule/page.tsx` — Schedule management
  - [ ] `log/page.tsx` — Irrigation log history

### 2.6 Pest & Disease Management

- [ ] **Backend** — extend `services/crop-service/`:
  - [ ] Prisma schema: `PestDiseaseRecord { id, cropId, farmId, type, name, severity, identifiedDate, treatment, treatedDate, outcome, notes }`
  - [ ] Type enum: `PEST`, `DISEASE`, `WEED`, `OTHER`
  - [ ] Severity enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
  - [ ] CRUD endpoints
  - [ ] `GET /crops/pest-disease/active` — currently active issues
- [ ] **Frontend** — `apps/admin/src/app/(app)/crops/pest-disease/`:
  - [ ] `page.tsx` — Active issues list with severity badges
  - [ ] `new/page.tsx` — Report new pest/disease
  - [ ] `[id]/page.tsx` — Record detail with treatment history

---

## Priority 3: Intelligence (Value-Add)

### 3.1 Weather Integration

- [ ] **Backend** — extend `services/platform-service/` or new `services/weather-service/`:
  - [ ] `GET /weather/current?lat=&lon=` — current weather from OpenWeather API
  - [ ] `GET /weather/forecast?lat=&lon=&days=7` — 7-day forecast
  - [ ] `GET /weather/alerts?lat=&lon=` — severe weather alerts
  - [ ] Cache responses for 30 minutes to reduce API calls
  - [ ] Store weather API key in `.env` (already in Settings UI)
- [ ] **Frontend** — weather widget on dashboard:
  - [ ] Current conditions card (temp, humidity, wind, icon)
  - [ ] 7-day forecast mini-chart
  - [ ] Weather alerts banner (frost warning, storm alert)
  - [ ] Link to full weather page
- [ ] **Farm detail page** — add weather section showing farm-location weather
- [ ] **Settings** — make OpenWeather API key input functional

### 3.2 Cost Analysis & Profitability

- [ ] **Backend** — extend `services/finance-service/`:
  - [ ] `GET /finance/profitability/farm?farmId=&startDate=&endDate=` — cost breakdown per farm
  - [ ] `GET /finance/profitability/crop?cropId=&startDate=&endDate=` — cost per crop cycle
  - [ ] `GET /finance/profitability/livestock?livestockId=&startDate=&endDate=` — cost per animal/batch
  - [ ] Auto-categorize expenses (feed, labor, medicine, equipment, other)
  - [ ] Calculate cost per unit (cost per hectare, cost per animal, cost per kg produced)
- [ ] **Frontend** — `apps/admin/src/app/(app)/finance/profitability/`:
  - [ ] `page.tsx` — Profitability overview:
    - [ ] Bar chart comparing farm profitability
    - [ ] Pie chart of expense categories
    - [ ] Table with per-farm breakdown
  - [ ] Drill-down pages for crop/livestock profitability
- [ ] **Finance page** — add "Profitability" tab

### 3.3 Yield Tracking

- [ ] **Backend** — extend `services/crop-service/`:ad
  - [ ] Prisma schema: `YieldRecord { id, cropId, cropCycleId, quantity, unit, quality, harvestedDate, notes }`
  - [ ] `POST /crops/{id}/yield` — record harvest yield
  - [ ] `GET /crops/{id}/yield` — yield history
  - [ ] `GET /crops/{id}/yield/summary` — total yield, average yield per area, yield trend
- [ ] **Frontend** — add "Yield" tab to crop detail page:
  - [ ] Yield history table
  - [ ] Bar chart showing yield per harvest period
  - [ ] Yield per hectare calculation
  - [ ] Compare against previous harvests

### 3.4 Automated/Scheduled Reports

- [ ] **Backend** — extend `services/reporting-service/`:
  - [ ] Prisma schema: `ScheduledReport { id, name, template, recipients, frequency, lastSent, nextSend, isActive }`
  - [ ] Frequency enum: `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`
  - [ ] `POST /reports/schedule` — create scheduled report
  - [ ] `GET /reports/schedule` — list scheduled reports
  - [ ] Cron job or scheduler to generate and email reports
- [ ] **Frontend** — `apps/admin/src/app/(app)/reports/scheduled/`:
  - [ ] `page.tsx` — List of scheduled reports with status
  - [ ] `new/page.tsx` — Create scheduled report (template, recipients, frequency)

### 3.5 Functional Reorder Alerts

- [ ] **Backend** — extend `services/inventory-service/`:
  - [ ] Add `minimumQuantity` field to InventoryItem schema
  - [ ] `GET /inventory/low-stock` — items where quantity <= minimumQuantity
  - [ ] `POST /inventory/{id}/reorder` — trigger reorder notification
  - [ ] WebSocket event `inventory:low-stock` when item falls below threshold
- [ ] **Frontend**:
  - [ ] Inventory list — add "Low Stock" filter tab
  - [ ] Inventory detail — add minimum quantity field to edit form
  - [ ] Dashboard — make "Low Stock Alerts" card functional (fetch from API)
  - [ ] Notifications — send notification when stock falls below minimum

### 3.6 Bulk Import/Export

- [ ] **Backend** — extend each service with bulk endpoints:
  - [ ] `POST /farms/import` — accept CSV/JSON, validate, create in batch
  - [ ] `POST /crops/import`, `POST /livestock/import`, `POST /workers/import`, `POST /inventory/import`
  - [ ] `GET /farms/export?format=csv|json` — export all farms
  - [ ] Same for all modules
- [ ] **Frontend**:
  - [ ] Add "Import" button to each list page
  - [ ] Upload dialog with CSV preview, field mapping, validation error display
  - [ ] Add "Export" dropdown to each list page (CSV, JSON, PDF)
  - [ ] Use existing `jsPDF` + `exceljs` (already in dependencies) for export

---

## Priority 4: Advanced (Competitive Advantage)

### 4.1 GPS Farm Mapping

- [ ] **Backend** — extend `services/farm-service/`:
  - [ ] Add `latitude`, `longitude`, `boundary` (GeoJSON) fields to Farm model
  - [ ] `GET /farms/{id}/map` — farm location data
  - [ ] `PUT /farms/{id}/location` — update GPS coordinates
- [ ] **Frontend** — install `react-leaflet` or `@react-google-maps/api`:
  - [ ] Farm detail page — add interactive map showing farm location
  - [ ] Farm list page — add map view toggle (table vs map)
  - [ ] Farm create/edit — add map picker for location
  - [ ] Dashboard — mini map showing all farm locations as pins
- [ ] **Farm types** — add GPS coordinates to farm create/edit forms

### 4.2 Equipment & Machinery Tracking

- [ ] **Backend** — new module or extend inventory:
  - [ ] Prisma schema: `Equipment { id, name, type, model, serialNumber, farmId, purchaseDate, purchaseCost, status, lastMaintenance, nextMaintenance }`
  - [ ] Prisma schema: `MaintenanceRecord { id, equipmentId, type, date, cost, description, performedBy }`
  - [ ] CRUD + maintenance scheduling
- [ ] **Frontend** — `apps/admin/src/app/(app)/equipment/`:
  - [ ] Equipment list with status filters (Active, Under Maintenance, Retired)
  - [ ] Maintenance schedule calendar
  - [ ] Equipment detail with maintenance history

### 4.3 Contract Management

- [ ] **Backend** — new service or extend finance:
  - [ ] Prisma schema: `Contract { id, type, buyerSellerName, entityId, entityType, startDate, endDate, value, status, terms, documents }`
  - [ ] Type enum: `BUY`, `SELL`
  - [ ] Status enum: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- [ ] **Frontend** — `apps/admin/src/app/(app)/contracts/`:
  - [ ] Contract list with status filters
  - [ ] Contract detail with key dates, value, linked entities
  - [ ] Contract renewal reminders

### 4.4 Document/File Management

- [ ] **Backend** — new service or extend platform-service:
  - [ ] File upload endpoint (S3/local storage)
  - [ ] Prisma schema: `Document { id, name, type, entityId, entityType, uploadedBy, uploadedAt, fileSize, mimeType, url }`
  - [ ] Entity types: farm, crop, livestock, worker, contract, invoice
- [ ] **Frontend**:
  - [ ] File upload component with drag-and-drop
  - [ ] Document gallery on entity detail pages
  - [ ] Document preview (images, PDFs)

### 4.5 Mobile PWA Support

- [ ] **Configuration**:
  - [ ] Create `public/manifest.json` with app name, icons, theme colors
  - [ ] Create `public/sw.js` service worker for offline caching
  - [ ] Add meta tags to `layout.tsx` for PWA install prompt
- [ ] **Offline support**:
  - [ ] Cache API responses for offline viewing
  - [ ] Queue write operations for sync when online
  - [ ] Show offline indicator (already exists as `OfflineBanner`)
- [ ] **Mobile optimization**:
  - [ ] Ensure all forms are thumb-friendly (larger touch targets)
  - [ ] Bottom navigation for key actions on mobile
  - [ ] Pull-to-refresh on list pages

### 4.6 Marketplace / Buyer Management

- [ ] **Backend** — new service:
  - [ ] Prisma schema: `Buyer { id, name, contact, email, phone, address, type, notes }`
  - [ ] Prisma schema: `MarketListing { id, entityType, entityId, title, price, unit, quantity, status, listedDate }`
  - [ ] CRUD for buyers and listings
- [ ] **Frontend** — `apps/admin/src/app/(app)/marketplace/`:
  - [ ] Buyer directory
  - [ ] Active listings
  - [ ] Sales history linked to buyers

---

## Implementation Order (Recommended Sequence)

```
Phase 1 (Weeks 1-2): Foundation
  ├── 1.1 Charting library setup
  ├── 1.2 Dashboard rewrite
  └── 1.5 Settings functional

Phase 2 (Weeks 3-4): Core Operations
  ├── 1.3 Task management (full stack)
  ├── 1.4 Worker attendance (full stack)
  └── 3.5 Reorder alerts

Phase 3 (Weeks 5-6): Crop Depth
  ├── 2.1 Crop calendar & lifecycle
  ├── 2.6 Pest & disease management
  └── 2.5 Irrigation scheduling

Phase 4 (Weeks 7-8): Livestock Depth
  ├── 2.2 Livestock health records
  ├── 2.3 Breeding records
  └── 2.4 Weight/growth tracking

Phase 5 (Weeks 9-10): Intelligence
  ├── 3.1 Weather integration
  ├── 3.2 Cost analysis & profitability
  └── 3.3 Yield tracking

Phase 6 (Weeks 11-12): Automation & Scale
  ├── 3.4 Automated reports
  ├── 3.6 Bulk import/export
  └── 4.5 Mobile PWA support

Phase 7 (Future): Advanced Features
  ├── 4.1 GPS farm mapping
  ├── 4.2 Equipment tracking
  ├── 4.3 Contract management
  ├── 4.4 Document management
  └── 4.6 Marketplace
```

---

## Notes

- **Backend services needed**: `task-service` (new), weather integration (extend platform-service), irrigation (extend crop-service or new)
- **Database migrations**: Each phase requires Prisma schema updates + migrations
- **Testing**: Write integration tests for each new endpoint and component tests for complex UI
- **API documentation**: Update API docs as new endpoints are added
- **Plan module alignment**: Ensure new modules (`task`, `leave`, `roster`) are added to the subscription plan system in `packages/types`
