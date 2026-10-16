import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriptionPlan!: string;

  @IsString()
  @IsNotEmpty()
  subscriptionStatus!: string;
}
