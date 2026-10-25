import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
} from '@nestjs/common';

import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { PermissionAny, PermissionAnyGuard } from '../../../../shared/auth/permission-any.guard';
import { ZodValidationPipe } from '@farm/utils';
import {
  createWorkerSchema,
  updateWorkerSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createTaskSchema,
  updateTaskSchema,
  createTaskCommentSchema,
  createTaskAttachmentSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  createShiftSchema,
  updateShiftSchema,
  createShiftAssignmentSchema,
  updateShiftAssignmentSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  upsertLeaveBalanceSchema,
} from '@farm/validation-server';
import { HrApplicationService } from '../../application/services/hr.service';

function getOrgId(req: any): string {
  return String((req as any).user?.organizationId || (req as any)['x-organization-id'] || '');
}

function getUserId(req: any): string {
  return String((req as any).user?.sub || (req as any)['x-user-id'] || (req as any).user?.id || '');
}

function getUserPermissions(req: any): string[] {
  return (req as any).user?.permissions ?? [];
}

function getUserName(req: any): string {
  const user = (req as any).user;
  return user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly hrService: HrApplicationService) {}

  // The org's departments, each carrying how many workers/tasks/shifts use
  // it — the counts are what the delete guard reports back.
  @Permission('hr.read')
  @Get()
  findAll(@Req() req: any) {
    return this.hrService.getDepartments(getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createDepartmentSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createDepartment(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateDepartmentSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateDepartment(id, getOrgId(req), body);
  }

  // Refused (409) while any worker, task or shift still references it.
  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteDepartment(id, getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('workers')
export class WorkerController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('farmId') farmId?: string,
    @Query('department') department?: string,
    @Query('departmentId') departmentId?: string,
    @Query('position') position?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrService.getAllWorkers(getOrgId(req), {
      search,
      status,
      farmId,
      department,
      departmentId,
      position,
      page,
      limit,
    });
  }

  @Permission('hr.read')
  // Declared before `:id` — otherwise Nest would match 'departments' as an id.
  @Get('departments')
  departments(@Req() req: any) {
    return this.hrService.getWorkerDepartments(getOrgId(req));
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getWorkerById(id, getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createWorkerSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createWorker({ ...body, organizationId: getOrgId(req) });
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateWorkerSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateWorker(id, getOrgId(req), body);
  }

  // Rotate the linked login's password and resend the invitation email.
  @Permission('hr.write')
  @Post(':id/reinvite')
  @HttpCode(HttpStatus.CREATED)
  reinvite(@Param('id') id: string, @Req() req: any) {
    return this.hrService.reinviteWorker(id, getOrgId(req));
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteWorker(id, getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Workers see their own records (worker.read, pinned to their own profile
  // in the service); managers see everyone (hr.read).
  @PermissionAny('hr.read', 'worker.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('workerId') workerId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.getAttendance(
      getOrgId(req),
      { workerId, date, startDate, endDate, status },
      { userId: getUserId(req), permissions: getUserPermissions(req) },
    );
  }

  @PermissionAny('hr.read', 'worker.read')
  @Get('today')
  today(@Req() req: any) {
    return this.hrService.getTodayAttendance(getOrgId(req), {
      userId: getUserId(req),
      permissions: getUserPermissions(req),
    });
  }

  // workerId omitted → org-wide summary for managers; workers are always
  // pinned to their own profile regardless of what they pass.
  @PermissionAny('hr.read', 'worker.read')
  @Get('summary')
  summary(
    @Req() req: any,
    @Query('workerId') workerId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.getAttendanceSummary(
      getOrgId(req),
      workerId || undefined,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      { userId: getUserId(req), permissions: getUserPermissions(req) },
    );
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createAttendanceSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createAttendance(getOrgId(req), body);
  }

  // The WORKER role clocks itself in/out with worker.write; managers can clock
  // any worker with hr.write. The service pins non-hr.write callers to their
  // own profile, so the body's workerId is only honoured for managers.
  @PermissionAny('hr.write', 'worker.write')
  @Post('clock-in')
  @HttpCode(HttpStatus.CREATED)
  clockIn(@Req() req: any, @Body() body: { workerId: string; workerName: string }) {
    return this.hrService.clockIn(getOrgId(req), body.workerId, body.workerName, {
      userId: getUserId(req),
      permissions: getUserPermissions(req),
    });
  }

  @PermissionAny('hr.write', 'worker.write')
  @Post('clock-out')
  clockOut(@Req() req: any, @Body() body: { workerId: string }) {
    return this.hrService.clockOut(getOrgId(req), body.workerId, {
      userId: getUserId(req),
      permissions: getUserPermissions(req),
    });
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateAttendanceSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateAttendance(id, getOrgId(req), body);
  }

  @Permission('hr.write')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Req() req: any, @Body() body: any) {
    // Accepts `{ records }`, `{ attendance }` or a bare array.
    const rows = Array.isArray(body) ? body : body?.records || body?.attendance || [];
    return this.hrService.bulkCreateAttendance(getOrgId(req), rows);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Workers list their own tasks (worker.read → scoped to their user/worker id
  // in the service); managers see the org's board (hr.read).
  @PermissionAny('hr.read', 'worker.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('farmId') farmId?: string,
    @Query('departmentId') departmentId?: string,
    // Record panels ask for the tasks linked to one row:
    // /tasks?linkedModule=crop&linkedRecordId=<cropCycleId>
    @Query('linkedModule') linkedModule?: string,
    @Query('linkedRecordId') linkedRecordId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrService.getTasks(getOrgId(req), getUserPermissions(req), getUserId(req), {
      status,
      priority,
      assignedToId,
      farmId,
      departmentId,
      linkedModule,
      linkedRecordId,
      search,
      page,
      limit,
    });
  }

  @PermissionAny('hr.read', 'worker.read')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getTaskById(id, getOrgId(req), getUserPermissions(req), getUserId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTaskSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createTask(getOrgId(req), getUserPermissions(req), (req as any).user, body);
  }

  // Managers edit the task in full; the assigned worker may still push their
  // own task through statuses — the service's self-service branch (below)
  // restricts non-hr.write callers to status-only updates on their own tasks.
  @PermissionAny('hr.write', 'worker.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateTaskSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateTask(id, getOrgId(req), getUserPermissions(req), getUserId(req), body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteTask(id, getOrgId(req));
  }

  @Permission('hr.write')
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Req() req: any, @Body() body: { status: string }) {
    return this.hrService.updateTaskStatus(id, getOrgId(req), body.status);
  }

  // ── Comments ──────────────────────────────────────────────────────────

  @PermissionAny('hr.read', 'worker.read')
  @Get(':id/comments')
  listComments(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getTaskComments(getOrgId(req), id);
  }

  @PermissionAny('hr.write', 'worker.write')
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTaskCommentSchema))
  addComment(@Param('id') id: string, @Req() req: any, @Body() body: { body: string }) {
    return this.hrService.addTaskComment(
      getOrgId(req),
      id,
      { id: getUserId(req), name: getUserName(req) },
      body.body,
    );
  }

  @PermissionAny('hr.write', 'hr.delete', 'worker.write')
  @Delete('comments/:id')
  removeComment(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteTaskComment(getOrgId(req), id, {
      userId: getUserId(req),
      permissions: getUserPermissions(req),
    });
  }

  // ── Attachments ───────────────────────────────────────────────────────

  @PermissionAny('hr.read', 'worker.read')
  @Get(':id/attachments')
  listAttachments(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getTaskAttachments(getOrgId(req), id);
  }

  @PermissionAny('hr.write', 'worker.write')
  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTaskAttachmentSchema))
  addAttachment(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { fileName: string; fileUrl: string; fileSize?: number },
  ) {
    return this.hrService.addTaskAttachment(
      getOrgId(req),
      id,
      { id: getUserId(req), name: getUserName(req) },
      body,
    );
  }

  @PermissionAny('hr.write', 'hr.delete', 'worker.write')
  @Delete('attachments/:id')
  removeAttachment(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteTaskAttachment(getOrgId(req), id, {
      userId: getUserId(req),
      permissions: getUserPermissions(req),
    });
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Readable by workers too (mobile roster view); management routes below
  // stay hr.write/hr.delete.
  @PermissionAny('hr.read', 'worker.read')
  @Get()
  findAll(@Req() req: any, @Query('departmentId') departmentId?: string) {
    return this.hrService.getShifts(getOrgId(req), { departmentId });
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createShiftSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createShift(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateShiftSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateShift(id, getOrgId(req), body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteShift(id, getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('shift-assignments')
export class ShiftAssignmentsController {
  constructor(private readonly hrService: HrApplicationService) {}

  @PermissionAny('hr.read', 'worker.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    return this.hrService.getShiftAssignments(getOrgId(req), { startDate, endDate, userId });
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createShiftAssignmentSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createShiftAssignment(getOrgId(req), body);
  }

  // Re-assign: move someone to a different shift/date or edit notes. Runs the
  // same duplicate + overlap checks as create (excluding itself).
  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateShiftAssignmentSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateShiftAssignment(id, getOrgId(req), body);
  }

  @Permission('hr.write')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Req() req: any, @Body() body: { assignments?: any[]; records?: any[] }) {
    // Web sends `{ assignments }`, mobile sends `{ records }`.
    const rows = body?.assignments || body?.records || [];
    return this.hrService.bulkCreateShiftAssignments(getOrgId(req), rows);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteShiftAssignment(id, getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('leave/types')
export class LeaveTypesController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Workers need the type list to request leave from the mobile app; managers
  // reach it with hr.read. Management routes below stay hr.write/hr.delete.
  @PermissionAny('leave.read', 'hr.read')
  @Get()
  findAll(@Req() req: any) {
    return this.hrService.getLeaveTypes(getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createLeaveTypeSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createLeaveType(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateLeaveTypeSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateLeaveType(id, getOrgId(req), body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteLeaveType(id, getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('leave/requests')
export class LeaveRequestsController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Managers see who's off today (hr.read). Not exposed to workers — it lists
  // the whole organization's leave, not just the caller's.
  @Permission('hr.read')
  @Get('on-leave')
  onLeave(@Req() req: any, @Query('date') date?: string) {
    return this.hrService.getWorkersOnLeave(getOrgId(req), date);
  }

  // Managers see everyone (hr.read); workers see only their own — the service
  // scopes non-hr.write callers to their own userId.
  @PermissionAny('leave.read', 'hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('userId') filterUserId?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.getLeaveRequests(getOrgId(req), getUserPermissions(req), getUserId(req), {
      status,
      userId: filterUserId,
      year,
    });
  }

  // One call to clear the pending queue: `{ ids, action, rejectionReason? }`.
  // Per-row results come back as { succeeded, failed }.
  @PermissionAny('hr.write', 'leave.approve')
  @Put('bulk')
  bulk(@Req() req: any, @Body() body: any) {
    return this.hrService.bulkLeaveDecision(
      getOrgId(req),
      getUserId(req),
      Array.isArray(body?.ids) ? body.ids : [],
      body?.action,
      body?.rejectionReason,
    );
  }

  // A worker requests their own leave (leave.write); an admin with hr.write may
  // also pass workerId to file on a worker's behalf.
  @PermissionAny('leave.write', 'hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createLeaveRequestSchema))
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createLeaveRequest(getOrgId(req), getUserId(req), body, getUserPermissions(req));
  }

  // Modify a request: the requester edits their own pending request; anyone
  // with hr.write (owners/managers) can edit any request in the org — fixing a
  // rejected one resubmits it as pending, and editing an approved one moves the
  // balance debit. Type/dates/reason only; the target user can't be changed.
  @PermissionAny('leave.write', 'hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateLeaveRequestSchema))
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateLeaveRequest(id, getOrgId(req), getUserId(req), body, getUserPermissions(req));
  }

  // Approving/rejecting: hr.write (owners/managers) or the dedicated
  // leave.approve permission the approvals UI checks for.
  @PermissionAny('hr.write', 'leave.approve')
  @Put(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.hrService.approveLeaveRequest(id, getOrgId(req), getUserId(req));
  }

  @PermissionAny('hr.write', 'leave.approve')
  @Put(':id/reject')
  reject(@Param('id') id: string, @Req() req: any, @Body() body: { rejectionReason?: string }) {
    return this.hrService.rejectLeaveRequest(id, getOrgId(req), getUserId(req), body.rejectionReason);
  }

  // The service enforces ownership (only the requester can cancel their own).
  @PermissionAny('leave.write', 'hr.write')
  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.hrService.cancelLeaveRequest(id, getOrgId(req), getUserId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('leave/balance')
export class LeaveBalanceController {
  constructor(private readonly hrService: HrApplicationService) {}

  // Workers check their own balance (leave.read); managers check anyone's
  // (hr.read + ?userId). Non-hr.read callers are pinned to their own userId so
  // a worker cannot read someone else's balance.
  @PermissionAny('leave.read', 'hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('year') yearStr?: string,
  ) {
    const permissions = getUserPermissions(req);
    const userId = permissions.includes('hr.read')
      ? (queryUserId || getUserId(req))
      : getUserId(req);
    const year = yearStr ? parseInt(yearStr) : undefined;
    return this.hrService.getLeaveBalance(getOrgId(req), userId, year);
  }

  // Every user's balance for the year — the admin "leave ledger" table. The
  // route sits before the plain GET above in path specificity ('/all').
  @Permission('hr.read')
  @Get('all')
  allBalances(@Req() req: any, @Query('year') yearStr?: string) {
    return this.hrService.getAllLeaveBalances(getOrgId(req), yearStr ? parseInt(yearStr) : undefined);
  }

  @Permission('hr.write')
  @Put()
  @UsePipes(new ZodValidationPipe(upsertLeaveBalanceSchema))
  upsert(@Req() req: any, @Body() body: any) {
    return this.hrService.upsertLeaveBalance(getOrgId(req), body);
  }
}

/**
 * Messaging serves two audiences: managers/supervisors in the admin app
 * (`hr.*`) and workers on the mobile app (`communication.*`), so every route
 * accepts either permission family.
 */
@UseGuards(JwtAuthGuard, AuthorizationGuard, PermissionAnyGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly hrService: HrApplicationService) {}

  @PermissionAny('hr.read', 'communication.read')
  @Get('inbox')
  inbox(@Req() req: any) {
    return this.hrService.getInbox(getOrgId(req), getUserId(req));
  }

  @PermissionAny('hr.read', 'communication.read')
  @Get('sent')
  sent(@Req() req: any) {
    return this.hrService.getSentMessages(getOrgId(req), getUserId(req));
  }

  @PermissionAny('hr.read', 'communication.read')
  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.hrService.getUnreadCount(getOrgId(req), getUserId(req));
  }

  /** People the caller can message: active users of their own organization. */
  @PermissionAny('hr.read', 'communication.read')
  @Get('recipients')
  listRecipients(@Req() req: any) {
    return this.hrService.getMessageRecipients(getOrgId(req), getUserId(req));
  }

  @PermissionAny('hr.read', 'communication.read')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getMessageById(id, getUserId(req), getOrgId(req));
  }

  @PermissionAny('hr.write', 'communication.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createMessage(getOrgId(req), getUserId(req), getUserName(req), body);
  }

  @PermissionAny('hr.delete', 'communication.write')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteMessage(id, getUserId(req), getOrgId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('correspondence')
export class CorrespondenceController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('archived') archived?: string,
  ) {
    return this.hrService.getCorrespondence(getOrgId(req), { status, type, category, archived });
  }

  @Permission('hr.read')
  @Get('stats')
  stats(@Req() req: any) {
    return this.hrService.getCorrespondenceStats(getOrgId(req));
  }

  @Permission('hr.read')
  @Get('attachments/:id')
  findAttachment(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getCorrespondenceAttachment(id, getOrgId(req));
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getCorrespondenceById(id, getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createCorrespondence(getOrgId(req), getUserId(req), getUserName(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateCorrespondence(id, getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id/archive')
  archive(@Param('id') id: string, @Req() req: any) {
    return this.hrService.archiveCorrespondence(id, getOrgId(req));
  }

  @Permission('hr.write')
  @Put(':id/unarchive')
  unarchive(@Param('id') id: string, @Req() req: any) {
    return this.hrService.unarchiveCorrespondence(id, getOrgId(req));
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteCorrespondence(id, getOrgId(req));
  }

  @Permission('hr.write')
  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  addAttachment(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.addCorrespondenceAttachment(id, getOrgId(req), getUserId(req), body);
  }

  @Permission('hr.delete')
  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAttachment(@Param('id') id: string, @Req() req: any) {
    return this.hrService.deleteCorrespondenceAttachment(id, getOrgId(req));
  }
}
