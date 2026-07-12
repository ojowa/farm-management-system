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
} from '@nestjs/common';

import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { HrApplicationService } from '../../application/services/hr.service';

function getOrgId(req: any): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: any): string {
  return String((req as any).user?.sub || (req as any)['x-user-id'] || (req as any).user?.id || '');
}

function getUserRole(req: any): string {
  return String((req as any).user?.role || '');
}

function getUserName(req: any): string {
  const user = (req as any).user;
  return user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('workers')
export class WorkerController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(@Req() req: any) {
    return this.hrService.getAllWorkers(getOrgId(req));
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hrService.getWorkerById(id);
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createWorker({ ...body, organizationId: getOrgId(req) });
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateWorker(id, body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteWorker(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('workerId') workerId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.getAttendance(getOrgId(req), { workerId, date, startDate, endDate, status });
  }

  @Permission('hr.read')
  @Get('today')
  today(@Req() req: any) {
    return this.hrService.getTodayAttendance(getOrgId(req));
  }

  @Permission('hr.read')
  @Get('summary')
  summary(
    @Req() req: any,
    @Query('workerId') workerId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.getAttendanceSummary(
      getOrgId(req),
      workerId || '',
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createAttendance(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Post('clock-in')
  @HttpCode(HttpStatus.CREATED)
  clockIn(@Req() req: any, @Body() body: { workerId: string; workerName: string }) {
    return this.hrService.clockIn(getOrgId(req), body.workerId, body.workerName);
  }

  @Permission('hr.write')
  @Post('clock-out')
  clockOut(@Req() req: any, @Body() body: { workerId: string }) {
    return this.hrService.clockOut(getOrgId(req), body.workerId);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateAttendance(id, body);
  }

  @Permission('hr.write')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Req() req: any, @Body() body: { records: any[] }) {
    return this.hrService.bulkCreateAttendance(getOrgId(req), body.records);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('farmId') farmId?: string,
    @Query('search') search?: string,
  ) {
    return this.hrService.getTasks(getOrgId(req), getUserRole(req), getUserId(req), {
      status,
      priority,
      assignedToId,
      farmId,
      search,
    });
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hrService.getTaskById(id);
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createTask(getOrgId(req), getUserRole(req), (req as any).user, body);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.hrService.updateTask(id, getUserRole(req), getUserId(req), body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteTask(id);
  }

  @Permission('hr.write')
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.hrService.updateTaskStatus(id, body.status);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(@Req() req: any) {
    return this.hrService.getShifts(getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createShift(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateShift(id, body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteShift(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('shift-assignments')
export class ShiftAssignmentsController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
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
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createShiftAssignment(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(@Req() req: any, @Body() body: { assignments: any[] }) {
    return this.hrService.bulkCreateShiftAssignments(getOrgId(req), body.assignments);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteShiftAssignment(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('leave/types')
export class LeaveTypesController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(@Req() req: any) {
    return this.hrService.getLeaveTypes(getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createLeaveType(getOrgId(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateLeaveType(id, body);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteLeaveType(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('leave/requests')
export class LeaveRequestsController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('userId') filterUserId?: string,
  ) {
    return this.hrService.getLeaveRequests(getOrgId(req), getUserRole(req), getUserId(req), {
      status,
      userId: filterUserId,
    });
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createLeaveRequest(getOrgId(req), getUserId(req), body);
  }

  @Permission('hr.write')
  @Put(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.hrService.approveLeaveRequest(id, getUserId(req), getUserRole(req));
  }

  @Permission('hr.write')
  @Put(':id/reject')
  reject(@Param('id') id: string, @Req() req: any, @Body() body: { rejectionReason?: string }) {
    return this.hrService.rejectLeaveRequest(id, getUserId(req), getUserRole(req), body.rejectionReason);
  }

  @Permission('hr.write')
  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.hrService.cancelLeaveRequest(id, getUserId(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('leave/balance')
export class LeaveBalanceController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('year') yearStr?: string,
  ) {
    const userId = queryUserId || getUserId(req);
    const year = yearStr ? parseInt(yearStr) : undefined;
    return this.hrService.getLeaveBalance(getOrgId(req), userId, year);
  }

  @Permission('hr.write')
  @Put()
  upsert(@Req() req: any, @Body() body: any) {
    return this.hrService.upsertLeaveBalance(getOrgId(req), body);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly hrService: HrApplicationService) {}

  @Permission('hr.read')
  @Get('inbox')
  inbox(@Req() req: any) {
    return this.hrService.getInbox(getOrgId(req), getUserId(req));
  }

  @Permission('hr.read')
  @Get('sent')
  sent(@Req() req: any) {
    return this.hrService.getSentMessages(getOrgId(req), getUserId(req));
  }

  @Permission('hr.read')
  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.hrService.getUnreadCount(getOrgId(req), getUserId(req));
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.hrService.getMessageById(id, getUserId(req), getOrgId(req));
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createMessage(getOrgId(req), getUserId(req), getUserName(req), body);
  }

  @Permission('hr.delete')
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
  findAttachment(@Param('id') id: string) {
    return this.hrService.getCorrespondenceAttachment(id);
  }

  @Permission('hr.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hrService.getCorrespondenceById(id);
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() body: any) {
    return this.hrService.createCorrespondence(getOrgId(req), getUserId(req), getUserName(req), body);
  }

  @Permission('hr.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateCorrespondence(id, body);
  }

  @Permission('hr.write')
  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.hrService.archiveCorrespondence(id);
  }

  @Permission('hr.write')
  @Put(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.hrService.unarchiveCorrespondence(id);
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.hrService.deleteCorrespondence(id);
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
  removeAttachment(@Param('id') id: string) {
    return this.hrService.deleteCorrespondenceAttachment(id);
  }
}
