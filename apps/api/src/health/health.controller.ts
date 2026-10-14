import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthService, HealthResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthResult> {
    const result = await this.healthService.checkHealth();
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
