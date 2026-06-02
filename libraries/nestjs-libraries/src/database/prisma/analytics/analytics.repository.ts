import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(
    private _postAnalytics: PrismaRepository<'postAnalytics'>,
    private _apiCallLog: PrismaRepository<'apiCallLog'>
  ) {}

  async upsertPostMetrics(
    postId: string,
    integrationId: string,
    organizationId: string,
    metrics: { metric: string; value: number }[]
  ) {
    const fetchedAt = new Date();
    await this._postAnalytics.model.postAnalytics.deleteMany({
      where: { postId, fetchedAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    return this._postAnalytics.model.postAnalytics.createMany({
      data: metrics.map(({ metric, value }) => ({
        postId,
        integrationId,
        organizationId,
        metric,
        value,
        fetchedAt,
      })),
    });
  }

  async getLatestPostMetrics(postId: string) {
    const rows = await this._postAnalytics.model.postAnalytics.findMany({
      where: { postId },
      orderBy: { fetchedAt: 'desc' },
      take: 100,
    });
    if (!rows.length) return null;

    const latestFetch = rows[0].fetchedAt;
    const latest = rows.filter(
      (r) => r.fetchedAt.getTime() === latestFetch.getTime()
    );
    return { metrics: latest, fetchedAt: latestFetch };
  }

  async getLastFetchedAt(integrationId: string) {
    const row = await this._postAnalytics.model.postAnalytics.findFirst({
      where: { integrationId },
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    });
    return row?.fetchedAt ?? null;
  }

  async logApiCall(service: string, endpoint: string) {
    return this._apiCallLog.model.apiCallLog.create({
      data: { service, endpoint },
    });
  }

  async countApiCallsInLastHour(service: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    return this._apiCallLog.model.apiCallLog.count({
      where: { service, calledAt: { gte: since } },
    });
  }

  async getPostsForIntegration(integrationId: string) {
    return this._postAnalytics.model.postAnalytics
      .findMany({
        where: { integrationId },
        distinct: ['postId'],
        select: { postId: true },
      })
      .then((rows) => rows.map((r) => r.postId));
  }
}
