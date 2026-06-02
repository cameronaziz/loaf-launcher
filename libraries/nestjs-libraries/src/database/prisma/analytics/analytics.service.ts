import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from '@gitroom/nestjs-libraries/database/prisma/analytics/analytics.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { timer } from '@gitroom/helpers/utils/timer';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';

const HOURLY_LIMIT = 200;
const THROTTLE_THRESHOLD = 160;
const SERVICE_NAME = 'instagram';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private _analyticsRepository: AnalyticsRepository,
    private _integrationManager: IntegrationManager,
    private _postsRepository: PostsRepository,
    private _integrationRepository: IntegrationRepository,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}

  async getStoredPostAnalytics(postId: string) {
    return this._analyticsRepository.getLatestPostMetrics(postId);
  }

  async getLastFetchedAt(integrationId: string) {
    return this._analyticsRepository.getLastFetchedAt(integrationId);
  }

  async syncAllIntegrations(): Promise<{ synced: number; skipped: number; throttled: boolean }> {
    const callCount = await this._analyticsRepository.countApiCallsInLastHour(SERVICE_NAME);

    if (callCount >= THROTTLE_THRESHOLD) {
      this.logger.warn(
        `Throttled: ${callCount}/${HOURLY_LIMIT} API calls used in the last hour`
      );
      return { synced: 0, skipped: 0, throttled: true };
    }

    const integrations = await this._integrationRepository.getIntegrations();
    const instagramIntegrations = integrations.filter(
      (i) => i.providerIdentifier === 'instagram' && !i.disabled && !i.deletedAt
    );

    let synced = 0;
    let skipped = 0;

    for (const integration of instagramIntegrations) {
      const currentCount = await this._analyticsRepository.countApiCallsInLastHour(SERVICE_NAME);
      if (currentCount >= THROTTLE_THRESHOLD) {
        this.logger.warn(`Throttle hit mid-sync at ${currentCount} calls`);
        break;
      }

      const result = await this.syncIntegration(integration);
      synced += result.synced;
      skipped += result.skipped;
    }

    return { synced, skipped, throttled: false };
  }

  async syncIntegration(integration: {
    id: string;
    organizationId: string;
    internalId: string;
    providerIdentifier: string;
    token: string;
    tokenExpiration?: Date | null;
    refreshToken?: string | null;
  }): Promise<{ synced: number; skipped: number }> {
    const provider = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    if (!provider?.postAnalytics) {
      return { synced: 0, skipped: 0 };
    }

    let token = integration.token;

    if (dayjs(integration.tokenExpiration).isBefore(dayjs())) {
      const refreshed = await this._refreshIntegrationService.refresh(integration as any);
      if (!refreshed?.accessToken) {
        this.logger.warn(`Token refresh failed for integration ${integration.id}`);
        return { synced: 0, skipped: 0 };
      }
      token = refreshed.accessToken;
      if ((provider as any).refreshWait) {
        await timer(10000);
      }
    }

    const publishedPosts = await this._postsRepository.getPublishedPostsForIntegration(
      integration.id,
      integration.organizationId
    );

    let synced = 0;
    let skipped = 0;

    for (const post of publishedPosts) {
      if (!post.releaseId || post.releaseId === 'missing') {
        skipped++;
        continue;
      }

      try {
        await this._analyticsRepository.logApiCall(SERVICE_NAME, `postAnalytics:${post.releaseId}`);

        const data = await provider.postAnalytics(
          integration.internalId,
          token,
          post.releaseId,
          30
        );

        if (!data?.length) {
          skipped++;
          continue;
        }

        const metrics = data.flatMap((d) =>
          d.data.map((point) => ({
            metric: d.label,
            value: point.total,
          }))
        );

        await this._analyticsRepository.upsertPostMetrics(
          post.id,
          integration.id,
          integration.organizationId,
          metrics
        );

        synced++;
      } catch (e) {
        if (e instanceof RefreshToken) {
          this.logger.warn(`Token refresh needed mid-sync for post ${post.id}`);
        } else {
          this.logger.error(`Failed to fetch analytics for post ${post.id}: ${e}`);
        }
        skipped++;
      }
    }

    return { synced, skipped };
  }

  async getRemainingHourlyCapacity(): Promise<number> {
    const used = await this._analyticsRepository.countApiCallsInLastHour(SERVICE_NAME);
    return Math.max(0, THROTTLE_THRESHOLD - used);
  }
}
