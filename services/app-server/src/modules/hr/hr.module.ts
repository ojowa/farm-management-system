import { Module } from '@nestjs/common';
import {
  WorkerController,
  AttendanceController,
  TasksController,
  ShiftsController,
  ShiftAssignmentsController,
  LeaveTypesController,
  LeaveRequestsController,
  LeaveBalanceController,
  MessagesController,
  CorrespondenceController,
} from './presentation/controllers/hr.controller';
import { HrApplicationService } from './application/services/hr.service';
import { HrEventService } from './infrastructure/messaging/hr.event.service';
import {
  PrismaWorkerRepository,
  PrismaAttendanceRepository,
  PrismaTaskRepository,
  PrismaShiftRepository,
  PrismaShiftAssignmentRepository,
  PrismaLeaveTypeRepository,
  PrismaLeaveRequestRepository,
  PrismaLeaveBalanceRepository,
  PrismaMessageRepository,
  PrismaMessageRecipientRepository,
  PrismaCorrespondenceRepository,
  PrismaCorrespondenceAttachmentRepository,
} from './infrastructure/persistence/prisma-hr.repository';

@Module({
  controllers: [
    WorkerController,
    AttendanceController,
    TasksController,
    ShiftsController,
    ShiftAssignmentsController,
    LeaveTypesController,
    LeaveRequestsController,
    LeaveBalanceController,
    MessagesController,
    CorrespondenceController,
  ],
  providers: [
    HrApplicationService,
    HrEventService,
    { provide: 'WorkerRepository', useClass: PrismaWorkerRepository },
    { provide: 'AttendanceRepository', useClass: PrismaAttendanceRepository },
    { provide: 'TaskRepository', useClass: PrismaTaskRepository },
    { provide: 'ShiftRepository', useClass: PrismaShiftRepository },
    { provide: 'ShiftAssignmentRepository', useClass: PrismaShiftAssignmentRepository },
    { provide: 'LeaveTypeRepository', useClass: PrismaLeaveTypeRepository },
    { provide: 'LeaveRequestRepository', useClass: PrismaLeaveRequestRepository },
    { provide: 'LeaveBalanceRepository', useClass: PrismaLeaveBalanceRepository },
    { provide: 'MessageRepository', useClass: PrismaMessageRepository },
    { provide: 'MessageRecipientRepository', useClass: PrismaMessageRecipientRepository },
    { provide: 'CorrespondenceRepository', useClass: PrismaCorrespondenceRepository },
    { provide: 'CorrespondenceAttachmentRepository', useClass: PrismaCorrespondenceAttachmentRepository },
  ],
  exports: [HrApplicationService],
})
export class HrModule {}
