import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationRequest {
  @ApiProperty({ description: 'Target user ID', example: 'user_123' })
  userId!: string;

  @ApiProperty({ description: 'Notification title', example: 'Farm alert' })
  title!: string;

  @ApiProperty({ description: 'Notification message body', example: 'Your flock needs attention' })
  message!: string;

  @ApiPropertyOptional({ description: 'Notification type', example: 'alert' })
  type?: string;

  @ApiPropertyOptional({ description: 'Deep link URL', example: 'farm-app://flocks/123' })
  link?: string;

  @ApiPropertyOptional({ description: 'Related entity type', example: 'flock' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID', example: 'flock_456' })
  entityId?: string;
}

export class SendBulkNotificationRequest {
  @ApiProperty({ description: 'Array of notifications to send', type: [CreateNotificationRequest] })
  notifications!: CreateNotificationRequest[];
}

export class UpdateNotificationRequest {
  @ApiPropertyOptional({ description: 'Notification title', example: 'Updated title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Notification message body', example: 'Updated message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Notification type', example: 'alert' })
  type?: string;

  @ApiPropertyOptional({ description: 'Deep link URL', example: 'farm-app://flocks/123' })
  link?: string;

  @ApiPropertyOptional({ description: 'Related entity type', example: 'flock' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID', example: 'flock_456' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'Read status', example: true })
  read?: boolean;

  /** @deprecated legacy alias for `read`. */
  @ApiPropertyOptional({ description: 'Read status (legacy)', example: true, deprecated: true })
  isRead?: boolean;
}

export class CreateDeviceTokenRequest {
  @ApiProperty({ description: 'Target user ID', example: 'user_123' })
  userId!: string;

  @ApiProperty({ description: 'Device push token', example: 'ExponentPushToken[xxxx]' })
  token!: string;

  @ApiProperty({ description: 'Device platform', example: 'ios', enum: ['web', 'ios', 'android'] })
  platform!: 'web' | 'ios' | 'android';
}
