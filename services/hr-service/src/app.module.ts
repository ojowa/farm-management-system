import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
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
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
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
})
export class AppModule {}
