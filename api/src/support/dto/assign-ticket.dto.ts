import { IsOptional, IsUUID } from 'class-validator';

export class AssignTicketDto {
  // Omit or send null to unassign.
  @IsOptional()
  @IsUUID()
  staffId?: string | null;
}
