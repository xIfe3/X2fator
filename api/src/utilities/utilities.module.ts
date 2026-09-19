import { Module } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { UtilitiesController } from './utilities.controller';
import { FlutterwaveBillsService } from './flutterwave-bills.service';

@Module({
  controllers: [UtilitiesController],
  providers: [UtilitiesService, FlutterwaveBillsService],
})
export class UtilitiesModule {}
