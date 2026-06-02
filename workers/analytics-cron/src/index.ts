export interface Env {
  BACKEND_URL: string;
  ANALYTICS_SYNC_KEY: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sync(env));
  },
} satisfies ExportedHandler<Env>;

async function sync(env: Env) {
  const url = `${env.BACKEND_URL}/analytics/sync`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-sync-key': env.ANALYTICS_SYNC_KEY,
      'content-type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Analytics sync failed: ${res.status} ${body}`);
    return;
  }

  const result = await res.json() as { synced: number; skipped: number; throttled: boolean };
  if (result.throttled) {
    console.warn('Analytics sync throttled — API rate limit close to threshold');
  } else {
    console.log(`Analytics sync complete: ${result.synced} synced, ${result.skipped} skipped`);
  }
}
