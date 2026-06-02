'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ChartSocial } from '@gitroom/frontend/components/analytics/chart-social';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: number; date: string }>;
  average?: boolean;
  percentageChange?: number;
}

interface AnalyticsResponse {
  data?: AnalyticsDataItem[];
  fetchedAt?: string | null;
}

const TrendIndicator: FC<{ value: number; average?: boolean }> = ({
  value,
  average,
}) => {
  if (value === 0) return null;

  const isPositive = value > 0;
  const displayValue = Math.abs(value).toFixed(1);

  return (
    <div
      className={`flex items-center gap-[4px] text-[13px] font-medium ${
        isPositive ? 'text-[#32d583]' : 'text-[#f97066]'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={isPositive ? '' : 'rotate-180'}
      >
        <path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor" />
      </svg>
      <span>
        {displayValue}
        {average ? 'pp' : '%'}
      </span>
    </div>
  );
};

const AnalyticsCard: FC<{
  item: AnalyticsDataItem;
  total: string | number;
  index: number;
}> = ({ item, total, index }) => {
  const colorVariants = ['purple', 'green', 'blue'] as const;
  const color = colorVariants[index % colorVariants.length];
  const hasDataPoints = item.data.length >= 1;

  return (
    <div className="group relative">
      <div
        className={`
          flex flex-col h-full
          bg-newTableHeader
          border border-newTableBorder
          rounded-[12px]
          overflow-hidden
          transition-all duration-200
          hover:border-[#612bd3]/50
        `}
      >
        <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[8px]">
          <div className="flex items-center gap-[10px]">
            <div
              className={`
                w-[8px] h-[8px] rounded-full
                ${color === 'purple' ? 'bg-[#612bd3]' : ''}
                ${color === 'green' ? 'bg-[#32d583]' : ''}
                ${color === 'blue' ? 'bg-[#1d9bf0]' : ''}
              `}
            />
            <span className="text-[15px] font-medium text-newTableText">
              {item.label}
            </span>
          </div>
          {item.percentageChange !== undefined && (
            <TrendIndicator value={item.percentageChange} average={item.average} />
          )}
        </div>

        {hasDataPoints ? (
          <>
            <div className="flex-1 px-[12px] py-[8px]">
              <div className="h-[120px] relative">
                <ChartSocial data={item.data} color={color} key={`chart-${index}`} />
              </div>
            </div>
            <div className="px-[16px] pb-[14px]">
              <div className="text-[36px] leading-[42px] font-semibold tracking-tight">
                {total}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-[32px] px-[16px]">
            <div className="text-[48px] leading-[56px] font-semibold tracking-tight">
              {total}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState: FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const t = useT();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-[48px] px-[24px] bg-newTableHeader border border-newTableBorder rounded-[12px]">
      <div className="w-[48px] h-[48px] mb-[16px] rounded-full bg-[#612bd3]/10 flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[#612bd3]"
        >
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M12 8v4l2 2" />
        </svg>
      </div>
      <p className="text-[15px] text-newTableText text-center mb-[12px]">
        {t(
          'this_channel_needs_to_be_refreshed',
          'This channel needs to be refreshed to display analytics'
        )}
      </p>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-[6px] px-[16px] py-[8px] text-[14px] font-medium text-white bg-[#612bd3] hover:bg-[#5023b8] rounded-[8px] transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        {t('refresh_channel', 'Refresh Channel')}
      </button>
    </div>
  );
};

const RefreshBar: FC<{
  fetchedAt: string | null | undefined;
  syncing: boolean;
  remaining: number;
  onSync: () => void;
}> = ({ fetchedAt, syncing, remaining, onSync }) => {
  const t = useT();
  const throttled = remaining === 0;

  const timeAgo = useMemo(() => {
    if (!fetchedAt) return null;
    const diff = Date.now() - new Date(fetchedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('just_now', 'just now');
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }, [fetchedAt]);

  return (
    <div className="flex items-center gap-[12px] mb-[12px]">
      {timeAgo && (
        <span className="text-[13px] text-newTableText opacity-60">
          {t('updated', 'Updated')} {timeAgo}
        </span>
      )}
      <button
        onClick={onSync}
        disabled={syncing || throttled}
        title={throttled ? 'API rate limit reached — try again shortly' : undefined}
        className={`
          inline-flex items-center gap-[6px] px-[12px] py-[5px] text-[13px] font-medium rounded-[6px] transition-all
          ${throttled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
            : 'text-white bg-[#612bd3] hover:bg-[#5023b8] cursor-pointer'
          }
        `}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={syncing ? 'animate-spin' : ''}
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
        {syncing
          ? t('syncing', 'Syncing...')
          : throttled
            ? t('throttled', 'Rate limited')
            : t('refresh', 'Refresh')}
      </button>
    </div>
  );
};

export const RenderAnalytics: FC<{
  integration: Integration;
  date: number;
}> = (props) => {
  const { integration, date } = props;
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [remaining, setRemaining] = useState(160);
  const fetch = useFetch();
  const t = useT();

  const load = useCallback(async (): Promise<AnalyticsResponse> => {
    setLoading(true);
    const res = await fetch(`/analytics/post/${integration.id}?date=${date}`);
    const json = await res.json();
    setLoading(false);

    // New DB-backed format: { data: [...], fetchedAt: '...' }
    if (json && typeof json === 'object' && 'data' in json) {
      return json as AnalyticsResponse;
    }
    // Legacy format: array directly from Instagram API fallback
    return { data: Array.isArray(json) ? json : [], fetchedAt: null };
  }, [integration, date]);

  const { data: response, mutate } = useSWR(
    `/analytics-${integration?.id}-${date}`,
    load,
    {
      refreshInterval: 0,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      revalidateOnMount: true,
    }
  );

  const analyticsData = response?.data;
  const fetchedAt = response?.fetchedAt;

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch('/analytics/sync', { method: 'POST' });
      await mutate();
      const capRes = await fetch('/analytics/capacity');
      const cap = await capRes.json();
      setRemaining(cap.remaining ?? 160);
    } finally {
      setSyncing(false);
    }
  }, [fetch, mutate]);

  const refreshChannel = useCallback(
    (integrationData: Integration & { identifier: string }) =>
      async () => {
        const { url } = await (
          await fetch(
            `/integrations/social/${integrationData.identifier}?refresh=${integrationData.internalId}`,
            { method: 'GET' }
          )
        ).json();
        window.location.href = url;
      },
    []
  );

  const totals = useMemo(() => {
    return analyticsData?.map((p: AnalyticsDataItem) => {
      const value =
        (p?.data.reduce(
          (acc: number, curr: { total: number }) => acc + curr.total,
          0
        ) || 0) / (p.average ? p.data.length : 1);
      if (p.average) {
        return value.toFixed(2) + '%';
      }
      return new Intl.NumberFormat().format(Math.round(value));
    });
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[48px]">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div>
      <RefreshBar
        fetchedAt={fetchedAt}
        syncing={syncing}
        remaining={remaining}
        onSync={handleSync}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {analyticsData?.length === 0 && (
          <EmptyState onRefresh={refreshChannel(integration as any)} />
        )}
        {analyticsData?.map((item: AnalyticsDataItem, index: number) => (
          <AnalyticsCard
            key={`analytics-${index}`}
            item={item}
            total={totals![index]}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};
