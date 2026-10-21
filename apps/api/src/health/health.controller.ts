import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiData } from '../common/swagger/api-data.decorator';
import { HealthService, HealthResult } from './health.service';
import { HealthDto } from '../common/swagger/models-extra';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Santé de l\'API (base de données et Redis)' })
  @ApiData({ type: HealthDto, description: 'API opérationnelle' })
  async check(): Promise<HealthResult> {
    const result = await this.healthService.checkHealth();
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
