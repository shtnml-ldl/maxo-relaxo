'use client';

import { useEffect, useState } from 'react';
import { AccountTable, OptimizationTable, StatCards, TrendChart } from '@/components';
import { MetricsResponse } from '@/lib/types';

export default function HomePage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/metrics');
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.message || 'Failed to load metrics');
        }
        const payload: MetricsResponse = await response.json();
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading data...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-lg">
          <h1 className="font-display text-xl text-ink mb-2">Unable to load data</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Maxo Relaxo</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink">
            Account pacing and optimization
          </h1>
          <p className="text-sm text-gray-500">
            Data updated through {data.meta.latestDate}. Forecast uses the last 7 days of spend.
          </p>
        </header>

        <StatCards
          targetTotal={data.totals.targetTotal}
          monthToDateSpend={data.totals.monthToDateSpend}
          avgDailySpend7={data.totals.avgDailySpend7}
          forecastedMonthEndSpend={data.totals.forecastedMonthEndSpend}
        />

        <TrendChart accounts={data.accounts} trends={data.trends} />

        <AccountTable accounts={data.accounts} />

        <OptimizationTable rows={data.optimization} meta={data.meta} />
      </div>
    </main>
  );
}
