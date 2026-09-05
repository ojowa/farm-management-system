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
  role: string;
  roleId: string;
  organizationId: string;
  phone?: string;
  avatar?: string;
  isPlatformAdmin?: boolean;
  planFeatures?: {
    modules: string[];
    maxFarms?: number;
    maxWorkers?: number;
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
  condition: string;
  diagnosis?: string;
  treatment?: string;
  veterinarian?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface VaccinationSchedule {
  id: string;
  livestockId: string;
  vaccine: string;
  dosage?: string;
  scheduledDate: string;
  administeredDate?: string;
  status: 'PENDING' | 'ADMINISTERED' | 'OVERDUE';
  createdAt: string;
}

export interface BreedingRecord {
  id: string;
  sireId: string;
  damId: string;
  breedingDate: string;
  expectedDueDate?: string;
  actualDueDate?: string;
  status: 'PLANNED' | 'PREGNANT' | 'COMPLETED' | 'FAILED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeightRecord {
  id: string;
  livestockId?: string;
  flockId?: string;
  weight: number;
  unit: string;
  date: string;
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
  name: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Breed {
  id: string;
  name: string;
  species: string;
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
  pen?: Pen;
  breed?: Breed;
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
  entityId: string;
  title: string;
  price: number;
  quantity: number;
  unit: string;
  status: 'ACTIVE' | 'SOLD' | 'EXPIRED';
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
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  hireDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  farmId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  hireDate?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';

export interface Attendance {
  id: string;
  workerId: string;
  worker?: Worker;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClockInRequest {
  workerId: string;
  workerName: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignee?: Worker;
  farmId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  workerId: string;
  date: string;
  createdAt: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  workerId: string;
  worker?: Worker;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  daysPerYear: number;
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
  name: string;
  type: string;
  status: string;
  data?: any;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: string;
  status: string;
  nextRun?: string;
  lastRun?: string;
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
