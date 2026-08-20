import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, WalletService, AuditService],
})
export class TasksModule {}
