import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { WalletService } from 'src/wallet/wallet.service';
import { AuditService } from './audit.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, WalletService, AuditService],
})
export class AdminModule {}
