import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorators';
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      service: '2xfactor-api',
      timestamp: new Date().toISOString(),
    };
  }
}
