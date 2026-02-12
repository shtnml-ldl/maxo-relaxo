export type SourcePlatform = 'Google' | 'Bing';
export type MediumType = 'cpc';

export interface DataRow {
  customerName: string;
  source: SourcePlatform;
  medium: MediumType;
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
  roas14: number;
  roas30: number;
  roas60: number;
  spend14: number;
  spend30: number;
  spend60: number;
  trend: 'Improving' | 'Declining' | 'Flat';
  action: 'Increase' | 'Decrease' | 'Hold';
}

export interface MetricsResponse {
  meta: {
    latestDate: string;
    monthStart: string;
    monthEnd: string;
    maxDateInCurrentMonth: string;
    last7Start: string;
    last14Start: string;
    last30Start: string;
    last60Start: string;
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
  debug?: {
    landalNlGoogle: {
      rawRows: number;
      rawSpend: number;
      rawSessions: number;
      rawEventValue: number;
      rawNumberOfEvents: number;
      includedRows: number;
      includedSpend: number;
      includedSessions: number;
      includedEventValue: number;
      includedNumberOfEvents: number;
      invalidSource: number;
      invalidMedium: number;
      invalidDate: number;
      missingSource: number;
      missingMedium: number;
      missingDate: number;
      missingSpend: number;
    };
    sheets: {
      name: string;
      rowCount: number;
      hasDataColumns: boolean;
      hasTargetColumns: boolean;
    }[];
  };
}
