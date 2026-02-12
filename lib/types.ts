export type SourcePlatform = 'Google' | 'Bing';

export interface DataRow {
  customerName: string;
  source: SourcePlatform;
  date: Date;
  campaignName: string;
  campaignId?: string;
  clicks: number;
  impressions: number;
  numberOfEvents: number;
  eventValue: number;
  spend: number;
}

export interface AccountSummary {
  key: string;
  customerName: string;
  source: SourcePlatform;
  target: number;
  monthToDateSpend: number;
  monthToDateRevenue: number;
  monthToDateBookings: number;
  monthToDateClicks: number;
  avgDailySpend7: number;
  forecastedMonthEndSpend: number;
  last7DaySpend: number;
  last7DayRevenue: number;
  last7DayBookings: number;
  last7DayClicks: number;
  roas30: number;
  convRate30: number;
  percentToTarget: number;
}

export interface TrendPoint {
  date: string;
  spend: number;
  cumulative: number;
  projectedCumulative: number | null;
}

export interface OptimizationRow {
  key: string;
  customerName: string;
  source: SourcePlatform;
  monthToDateSpend: number;
  avgDailySpend7: number;
  optimizedAvgDailySpend: number;
  roas30: number;
  convRate30: number;
}

export interface MetricsResponse {
  meta: {
    latestDate: string;
    monthStart: string;
    monthEnd: string;
    daysElapsed: number;
    remainingDays: number;
  };
  totals: {
    targetTotal: number;
    monthToDateSpend: number;
    avgDailySpend7: number;
    forecastedMonthEndSpend: number;
  };
  accounts: AccountSummary[];
  trends: Record<string, TrendPoint[]>;
  optimization: OptimizationRow[];
}
