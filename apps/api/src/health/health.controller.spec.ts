import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService, HealthResult } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthService = {
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService) as jest.Mocked<HealthService>;
  });

  it('returns HTTP 200 with all-ok body when both services are healthy', async () => {
    const result: HealthResult = {
      status: 'ok',
      db: 'ok',
      redis: 'ok',
      uptime: 42,
    };
    healthService.checkHealth.mockResolvedValue(result);

    const response = await controller.check();
    expect(response).toEqual(result);
  });

  it('throws HttpException 503 when db probe fails', async () => {
    const result: HealthResult = {
      status: 'error',
      db: 'error',
      redis: 'ok',
      uptime: 42,
    };
    healthService.checkHealth.mockResolvedValue(result);

    const rejection = controller.check();
    await expect(rejection).rejects.toThrow(HttpException);
    await expect(rejection).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: result,
    });
  });

  it('throws HttpException 503 when redis probe fails', async () => {
    const result: HealthResult = {
      status: 'error',
      db: 'ok',
      redis: 'error',
      uptime: 42,
    };
    healthService.checkHealth.mockResolvedValue(result);

    const rejection = controller.check();
    await expect(rejection).rejects.toThrow(HttpException);
    await expect(rejection).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: result,
    });
  });

  it('throws HttpException 503 when both probes fail', async () => {
    const result: HealthResult = {
      status: 'error',
      db: 'error',
      redis: 'error',
      uptime: 42,
    };
    healthService.checkHealth.mockResolvedValue(result);

    const rejection = controller.check();
    await expect(rejection).rejects.toThrow(HttpException);
    await expect(rejection).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: result,
    });
  });
});
