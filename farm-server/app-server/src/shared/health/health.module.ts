import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Shared liveness route (`GET /health`). Imported by every service
 * entrypoint in `src/microservices/*.main.ts`.
 *
 * Not imported by the gateway (`api.main.ts`): its `setGlobalPrefix('v1')`
 * already exposes `/v1/health` through `modules/api/proxy/health.controller`.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
