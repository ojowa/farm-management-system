import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'Subscription plan name', example: 'professional' })
  @IsString()
  @IsNotEmpty()
  subscriptionPlan!: string;

  @ApiProperty({ description: 'Subscription status', example: 'active' })
  @IsString()
  @IsNotEmpty()
  subscriptionStatus!: string;
}
