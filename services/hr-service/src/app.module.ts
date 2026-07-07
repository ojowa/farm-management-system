import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { LeaveTypesModule } from './modules/leavetypes/leavetypes.module';
import { LeaveRequestsModule } from './modules/leaverequests/leaverequests.module';
import { LeaveBalanceModule } from './modules/leavebalance/leavebalance.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ShiftAssignmentsModule } from './modules/shiftassignments/shiftassignments.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CorrespondenceModule } from './modules/correspondence/correspondence.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttendanceModule } from './modules/attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    LeaveTypesModule,
    LeaveRequestsModule,
    LeaveBalanceModule,
    ShiftsModule,
    ShiftAssignmentsModule,
    MessagesModule,
    CorrespondenceModule,
    TasksModule,
    AttendanceModule,
  ],
})
export class AppModule {}
