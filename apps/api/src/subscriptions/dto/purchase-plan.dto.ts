import { IsUUID } from 'class-validator';

export class PurchasePlanDto {
  @IsUUID()
  planId!: string;
}
