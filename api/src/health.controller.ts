import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { pool } from './database';
import { Public } from './common/decorators/auth.decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  async health() {
    try {
      await pool.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: '2xfactor-api',
        database: 'error',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: '2xfactor-api',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
