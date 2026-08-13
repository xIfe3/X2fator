import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, WalletService],
})
export class TasksModule {}
