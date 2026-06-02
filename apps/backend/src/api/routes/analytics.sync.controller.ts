import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from '@gitroom/nestjs-libraries/database/prisma/analytics/analytics.service';

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsSyncController {
  constructor(private _analyticsService: AnalyticsService) {}

  @Post('/sync')
  async syncAnalytics(@Headers('x-sync-key') syncKey: string) {
    const expectedKey = process.env.ANALYTICS_SYNC_KEY;
    if (!expectedKey || syncKey !== expectedKey) {
      throw new UnauthorizedException('Invalid sync key');
    }
    return this._analyticsService.syncAllIntegrations();
  }
}
