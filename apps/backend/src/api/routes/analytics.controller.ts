import { Controller, Get, Param, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { AnalyticsService } from '@gitroom/nestjs-libraries/database/prisma/analytics/analytics.service';

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _analyticsService: AnalyticsService
  ) {}

  @Get('/:integration')
  async getIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    return this._integrationService.checkAnalytics(org, integration, date);
  }

  @Get('/post/:postId')
  async getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Query('date') date: string
  ) {
    const stored = await this._analyticsService.getStoredPostAnalytics(postId);
    if (stored) {
      return {
        data: stored.metrics.map((m) => ({
          label: m.metric,
          percentageChange: 0,
          data: [{ total: m.value, date: m.fetchedAt }],
        })),
        fetchedAt: stored.fetchedAt,
      };
    }
    return this._postsService.checkPostAnalytics(org.id, postId, +date);
  }

  @Get('/post/:postId/last-fetched')
  async getLastFetched(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    const stored = await this._analyticsService.getStoredPostAnalytics(postId);
    return { fetchedAt: stored?.fetchedAt ?? null };
  }

  @Get('/capacity')
  async getCapacity(@GetOrgFromRequest() _org: Organization) {
    const remaining = await this._analyticsService.getRemainingHourlyCapacity();
    return { remaining, limit: 160 };
  }
}
