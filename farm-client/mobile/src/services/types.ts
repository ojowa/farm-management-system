// ─── Backend Response Envelope ──────────────────────────────────────────────────
// The API gateway wraps all responses in this shape.
// Mobile auto-unwraps it in the interceptor, but we keep the type for reference.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  mfaRequired?: boolean;
  mfaSessionToken?: string;
}

export interface VerifyMfaRequest {
  mfaToken: string;
  code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  /** The session user's role is a plain string (auth maps role.name); the
   * org-admin list returns the Role relation object instead — see roleLabel()
   * in the users screens before rendering it. */
  role: string;
  roleId: string;
  organizationId: string;
  phone?: string;
  avatar?: string;
  /** From SAFE_USER_SELECT on /org-admin/users — null phone / missing
   * isPlatformAdmin there means the field simply isn't returned. */
  isActive?: boolean;
  isPlatformAdmin?: boolean;
  planFeatures?: {
    modules: string[];
    farmTypes?: string[];
    maxFarms?: number;
    maxWorkers?: number;
    maxUsers?: number;
    maxStorage?: number;
  };
  permissions?: string[];
}

// ─── Farm ──────────────────────────────────────────────────────────────────────

export type FarmType = 'CROP' | 'LIVESTOCK' | 'POULTRY' | 'DAIRY' | 'AQUACULTURE';

export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  farmType: FarmType;
  location?: string;
  latitude?: number;
  longitude?: number;
  size: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  fields?: Field[];
}

export interface CreateFarmRequest {
  organizationId: string;
  name: string;
  farmType: FarmType;
  location?: string;
  latitude?: number;
  longitude?: number;
  size?: number;
  status?: string;
}

export interface UpdateFarmRequest {
  name?: string;
  farmType?: FarmType;
  location?: string;
  latitude?: number;
  longitude?: number;
  size?: number;
  status?: string;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldRequest {
  farmId: string;
  name: string;
  size: number;
}

// ─── Crop ──────────────────────────────────────────────────────────────────────

export interface Crop {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCropRequest {
  name: string;
}

export type CropCycleStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export interface CropCycle {
  id: string;
  fieldId: string;
  cropId: string;
  crop?: Crop;
  field?: Field;
  plantingDate: string;
  harvestDate?: string;
  health: number;
  status: CropCycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCropCycleRequest {
  fieldId: string;
  cropId: string;
  plantingDate: string;
  harvestDate?: string;
  health?: number;
  status?: CropCycleStatus;
}

export interface CropStage {
  id: string;
  cropCycleId: string;
  name: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Livestock ─────────────────────────────────────────────────────────────────

export type LivestockStatus = 'HEALTHY' | 'SICK' | 'SOLD' | 'DECEASED';
export type Gender = 'MALE' | 'FEMALE';

export interface Livestock {
  id: string;
  farmId: string;
  farm?: Farm;
  species: string;
  breed?: string;
  gender: Gender;
  birthDate: string;
  status: LivestockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLivestockRequest {
  farmId: string;
  species: string;
  breed?: string;
  gender: Gender;
  birthDate: string;
  status: LivestockStatus;
}

export interface UpdateLivestockRequest {
  species?: string;
  breed?: string;
  gender?: Gender;
  birthDate?: string;
  status?: LivestockStatus;
}

export interface HealthRecord {
  id: string;
  livestockId: string;
  type: string;
  description: string;
  veterinarian?: string | null;
  medications?: string | null;
  cost?: number | null;
  nextCheckupDate?: string | null;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface CreateHealthRecordRequest {
  type: string;
  date: string;
  description: string;
  veterinarian?: string;
  medications?: string;
  cost?: number;
  nextCheckupDate?: string;
}

export interface VaccinationSchedule {
  id: string;
  livestockId: string;
  vaccineName: string;
  scheduledDate: string;
  administeredDate?: string;
  status: 'SCHEDULED' | 'ADMINISTERD' | 'MISSED' | 'CANCELLED';
  notes?: string | null;
  createdAt: string;
}

export interface BreedingRecord {
  id: string;
  sireId: string;
  sireName?: string | null;
  damId: string;
  damName?: string | null;
  breedingDate: string;
  expectedDueDate?: string;
  actualBirthDate?: string | null;
  offspringCount?: number | null;
  status: 'BRED' | 'PLANNED' | 'PREGNANT' | 'COMPLETED' | 'FAILED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBreedingRecordRequest {
  sireId: string;
  damId: string;
  breedingDate: string;
  expectedDueDate?: string;
  notes?: string;
}

export interface WeightRecord {
  id: string;
  livestockId?: string;
  flockId?: string;
  weight: number;
  unit: string;
  recordedDate: string;
  notes?: string | null;
  createdAt: string;
}

// ─── Poultry ───────────────────────────────────────────────────────────────────

export type FlockStatus = 'ACTIVE' | 'DECEASED' | 'SOLD' | 'COMPLETED';

export interface PoultryHouse {
  id: string;
  farmId: string;
  name: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pen {
  id: string;
  poultryHouseId: string;
  /**
   * Denormalized by the server on create. Optional: the owning
   * `poultryHouseId` (and that house's `farmId`) is the source of truth for
   * which farm a pen belongs to — see `flockChain.ts`.
   */
  farmId?: string;
  name: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Breed {
  id: string;
  name: string;
  /** BROILER / LAYER / … — what the API actually returns. */
  birdType: string;
  /** Legacy client-side alias kept so older call sites keep compiling. */
  species?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flock {
  id: string;
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  /** Read-only joins the server attaches to flock reads (`Partial`: only the
   *  display fields are guaranteed — see `FLOCK_INCLUDE` on the server). */
  pen?: Partial<Pen> & { poultryHouse?: Partial<PoultryHouse> } | null;
  breed?: Partial<Breed> | null;
  farm?: { id: string; name: string } | null;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: string;
  currentAgeDays: number;
  status: FlockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlockRequest {
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: string;
  currentAgeDays?: number;
  status?: FlockStatus;
}

export interface FeedingRecord {
  id: string;
  flockId: string;
  feedType: string;
  quantityKg: number;
  date: string;
  createdAt: string;
}

export interface VaccinationRecord {
  id: string;
  flockId: string;
  vaccine: string;
  dosage?: string;
  date: string;
  createdAt: string;
}

export interface MortalityRecord {
  id: string;
  flockId: string;
  count: number;
  cause?: string;
  date: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  flockId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EggProductionRecord {
  id: string;
  flockId: string;
  date: string;
  totalEggs: number;
  goodEggs: number;
  brokenEggs: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoultrySale {
  id: string;
  farmId?: string | null;
  flockId?: string | null;
  date: string;
  buyerName?: string | null;
  birdType: string;
  quantity: number;
  weight?: number | null;
  pricePerBird?: number | null;
  totalAmount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Aquaculture ──────────────────────────────────────────────────────────────

export type PondType = 'FISH' | 'SHRIMP' | 'CRAB' | 'MIXED';
export type PondStatus = 'active' | 'draining' | 'maintenance' | 'retired';
export type PondStockingStatus = 'ongoing' | 'completed' | 'failed';

export interface Pond {
  id: string;
  organizationId: string;
  farmId: string;
  farm?: Farm;
  name: string;
  pondType: PondType;
  area: number | null;
  waterSource: string | null;
  capacity: number | null;
  status: PondStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePondRequest {
  name: string;
  farmId: string;
  pondType?: PondType;
  area?: number;
  waterSource?: string;
  capacity?: number;
  status?: PondStatus;
  notes?: string;
}

export interface UpdatePondRequest {
  name?: string;
  farmId?: string;
  pondType?: PondType;
  area?: number;
  waterSource?: string;
  capacity?: number;
  status?: PondStatus;
  notes?: string;
}

export interface PondStocking {
  id: string;
  pondId: string;
  species: string;
  strain: string | null;
  count: number;
  source: string | null;
  totalCost: number | null;
  stockedAt: string;
  expectedHarvestAt: string | null;
  status: PondStockingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePondStockingRequest {
  species: string;
  strain?: string;
  count: number;
  source?: string;
  totalCost?: number;
  stockedAt: string;
  expectedHarvestAt?: string;
  status?: PondStockingStatus;
  notes?: string;
}

export interface UpdatePondStockingRequest {
  species?: string;
  strain?: string;
  count?: number;
  source?: string;
  totalCost?: number;
  stockedAt?: string;
  expectedHarvestAt?: string;
  status?: PondStockingStatus;
  notes?: string;
}

export interface PondFeeding {
  id: string;
  pondId: string;
  stockingId: string | null;
  feedType: string;
  quantityKg: number;
  cost: number | null;
  fedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePondFeedingRequest {
  feedType: string;
  quantityKg: number;
  cost?: number;
  fedAt: string;
  notes?: string;
  stockingId?: string;
}

export interface PondWaterQuality {
  id: string;
  pondId: string;
  ph: number | null;
  temperatureC: number | null;
  dissolvedOxygen: number | null;
  ammonia: number | null;
  turbidity: number | null;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePondWaterQualityRequest {
  ph?: number;
  temperatureC?: number;
  dissolvedOxygen?: number;
  ammonia?: number;
  turbidity?: number;
  recordedAt: string;
  notes?: string;
}

export interface PondHarvest {
  id: string;
  pondId: string;
  stockingId: string | null;
  quantityKg: number;
  count: number | null;
  unitPrice: number | null;
  revenue: number | null;
  harvestedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePondHarvestRequest {
  quantityKg: number;
  count?: number;
  unitPrice?: number;
  revenue?: number;
  harvestedAt: string;
  notes?: string;
  stockingId?: string;
}

// ─── Finance ───────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  farmId: string;
  farm?: Farm;
  title: string;
  amount: number;
  date: string;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  farmId: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
}

export interface Sale {
  id: string;
  farmId: string;
  farm?: Farm;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  buyerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSaleRequest {
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  buyerId?: string;
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

export interface Contract {
  id: string;
  title: string;
  type: string;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  value?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Buyer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketListing {
  id: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  price: number;
  quantity: number;
  unit: string;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  listedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  period: { start: string; end: string };
}

export interface FarmProfitability {
  farmId: string;
  farmName: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// ─── HR ────────────────────────────────────────────────────────────────────────

export interface Worker {
  id: string;
  farmId: string;
  farm?: Farm;
  /** Login account linked to this worker (null for legacy workers). */
  userId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  /** Owning Department row — the server keeps `department` (name) in sync. */
  departmentId?: string | null;
  hireDate?: string;
  /** Server enum: ACTIVE | INACTIVE | PROBATION | TERMINATED. */
  status: string;
  // Employment / payroll (20261019 HR schema migration)
  payRate?: number | null;
  payType?: string | null;
  terminationDate?: string | null;
  skills?: string[];
  // Emergency contact
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  farmId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  /** Required by createWorkerSchema — it is the worker's login. */
  email: string;
  phone?: string;
  position: string;
  department?: string;
  /** Owning Department row id — resolves server-side; wins over `department`. */
  departmentId?: string;
  hireDate?: string;
  /** Login role — org-applicable roles only; omitted means system WORKER. */
  roleId?: string;
  payRate?: number | null;
  payType?: string | null;
  terminationDate?: string | null;
  skills?: string[];
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';

export interface Attendance {
  id: string;
  workerId: string;
  workerName?: string;
  worker?: Worker;
  date: string;
  /** Serialized "HH:MM" on the wire (full DateTime in the DB). */
  clockIn?: string;
  clockOut?: string;
  hoursWorked?: number | null;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /attendance/today and /attendance/summary respond with this envelope. */
export interface AttendanceSummary {
  total?: number;
  totalDays?: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  totalHours?: number;
  attendanceRate?: number;
}

export interface ClockInRequest {
  workerId: string;
  workerName: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Farm-module record a task was raised against (Task.linkedModule).
 * Must stay in step with the server's zod enum (hr.schema.ts). `field` and
 * `inventory` are valid on the wire but the mobile picker offers only the
 * seven modules that own a detail screen.
 */
export type TaskLinkModule =
  | 'farm'
  | 'field'
  | 'crop'
  | 'livestock'
  | 'poultry'
  | 'aquaculture'
  | 'equipment'
  | 'inventory'
  | 'contract';

/** A department row (GET /departments), each carrying usage counts. */
export interface Department {
  id: string;
  name: string;
  description?: string | null;
  /** Present on list responses only (hr.service getDepartments). */
  counts?: { workers: number; tasks: number; shifts: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  assignee?: Worker;
  farmId?: string;
  /** Owning department — travels as an id; resolve it through departmentsAPI. */
  departmentId?: string | null;
  /** Farm-module record this task was raised against; null/absent = unlinked. */
  linkedModule?: TaskLinkModule | string | null;
  linkedRecordId?: string | null;
  /** Denormalised so the task stays readable when the record itself is gone. */
  linkedRecordName?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  /** Recurring tasks spawn their next occurrence on COMPLETED. */
  isRecurring?: boolean;
  recurrenceRule?: string | null; // DAILY | WEEKLY | MONTHLY
  nextDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body accepted by POST /tasks (createTaskSchema). */
export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignedToId?: string | null;
  assignedToName?: string | null;
  farmId?: string | null;
  departmentId?: string | null;
  linkedModule?: TaskLinkModule | null;
  linkedRecordId?: string | null;
  linkedRecordName?: string | null;
  dueDate?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

/** Body accepted by PUT /tasks/:id (updateTaskSchema) — every field optional. */
export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId?: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  uploadedById?: string | null;
  uploadedByName?: string | null;
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  /** Days the shift runs (["MON","TUE",…]); empty/omitted = every day. */
  daysOfWeek?: string[];
  /** Legacy DTO field — same content as daysOfWeek. */
  days?: string[];
  color?: string | null;
  /** Owning department (create/update bodies accept `departmentId: string|null`). */
  departmentId?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  /** The assigned user's login id (enriched with `userName` server-side). */
  userId: string;
  userName?: string | null;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  /** The requesting user's login id. */
  userId: string;
  /** Linked worker profile of the requester (null when none). */
  workerId?: string | null;
  /** Display name of the requester (attached for hr.read viewers). */
  requesterName?: string | null;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;
  status: LeaveStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  daysPerYear: number;
  isPaid?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  sender?: Worker;
  subject: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Correspondence {
  id: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  archived: boolean;
  attachments?: CorrespondenceAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CorrespondenceAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  status: string;
  farmId?: string | null;
  parameters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  template: string;
  recipients: string[];
  frequency: string;
  isActive: boolean;
  nextSend?: string | null;
  lastSent?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

// ─── Equipment ────────────────────────────────────────────────────────────────────

export interface Equipment {
  id: string;
  organizationId: string;
  farmId: string | null;
  name: string;
  type: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  status: string;
  notes: string | null;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentRequest {
  farmId?: string;
  name: string;
  type?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  status?: string;
  notes?: string;
}

// ─── Common ────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListParams extends PaginationParams {
  search?: string;
  [key: string]: any;
}
