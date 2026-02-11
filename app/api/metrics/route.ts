import { NextResponse } from 'next/server';
import { SheetsClient } from '@/lib/sheets-client';
import { AccountSummary, MetricsResponse, OptimizationRow, TrendPoint } from '@/lib/types';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json(
        {
          error: 'Google Sheets integration not configured',
          message: 'Missing GOOGLE_SHEETS_CREDENTIALS or GOOGLE_SHEET_ID'
        },
        { status: 503 }
      );
    }

    const sheetsClient = new SheetsClient();
    const { rows, targets } = await sheetsClient.fetchAllSheets();

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: 'No data found in sheets',
          message: 'No rows found across any sheets'
        },
        { status: 404 }
      );
    }

    const latestDate = rows.reduce((max, row) => (row.date > max ? row.date : max), rows[0].date);
    const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.max(1, Math.floor((latestDate.getTime() - monthStart.getTime()) / msPerDay) + 1);
    const remainingDays = Math.max(0, Math.ceil((monthEnd.getTime() - latestDate.getTime()) / msPerDay));

    const targetMap = new Map<string, number>();
    for (const target of targets) {
      const key = `${target.customerName}|${target.source ?? 'ALL'}`;
      targetMap.set(key, target.target);
    }

    const accountMap = new Map<string, AccountSummary>();
    const trendMap: Record<string, TrendPoint[]> = {};

    const last7Start = new Date(latestDate);
    last7Start.setDate(last7Start.getDate() - 6);

    const dailySpendMap = new Map<string, Map<string, number>>();

    for (const row of rows) {
      const key = `${row.customerName}|${row.source}`;
      if (!accountMap.has(key)) {
        const targetKey = targetMap.get(key) ?? targetMap.get(`${row.customerName}|ALL`) ?? 0;
        accountMap.set(key, {
          key,
          customerName: row.customerName,
          source: row.source,
          target: targetKey,
          monthToDateSpend: 0,
          avgDailySpend7: 0,
          forecastedMonthEndSpend: 0,
          last7DaySpend: 0,
          last7DayRevenue: 0,
          last7DayBookings: 0,
          last7DayClicks: 0,
          roas7: 0,
          convRate7: 0,
          percentToTarget: 0
        });
      }

      const account = accountMap.get(key)!;
      if (row.date >= monthStart && row.date <= latestDate) {
        account.monthToDateSpend += row.spend;
      }

      if (row.date >= last7Start && row.date <= latestDate) {
        account.last7DaySpend += row.spend;
        account.last7DayRevenue += row.eventValue;
        account.last7DayBookings += row.numberOfEvents;
        account.last7DayClicks += row.clicks;
      }

      if (!dailySpendMap.has(key)) {
        dailySpendMap.set(key, new Map<string, number>());
      }
      const dayKey = row.date.toISOString().split('T')[0];
      const perDay = dailySpendMap.get(key)!;
      perDay.set(dayKey, (perDay.get(dayKey) || 0) + row.spend);
    }

    const accounts: AccountSummary[] = [];
    for (const account of accountMap.values()) {
      const dailySpend = dailySpendMap.get(account.key) || new Map<string, number>();
      const activeDays7 = Array.from(dailySpend.keys()).filter((dateStr) => {
        const date = new Date(dateStr);
        return date >= last7Start && date <= latestDate;
      }).length;

      account.avgDailySpend7 = activeDays7 > 0 ? account.last7DaySpend / activeDays7 : 0;
      account.forecastedMonthEndSpend = account.monthToDateSpend + (account.avgDailySpend7 * remainingDays);
      account.roas7 = account.last7DaySpend > 0 ? account.last7DayRevenue / account.last7DaySpend : 0;
      account.convRate7 = account.last7DayClicks > 0 ? account.last7DayBookings / account.last7DayClicks : 0;
      account.percentToTarget = account.target > 0 ? account.monthToDateSpend / account.target : 0;
      accounts.push(account);

      const points: TrendPoint[] = [];
      let cumulative = 0;
      for (let day = 1; day <= monthEnd.getDate(); day += 1) {
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
        const dateKey = date.toISOString().split('T')[0];
        const spend = dailySpend.get(dateKey) || 0;
        if (date <= latestDate) {
          cumulative += spend;
          points.push({
            date: dateKey,
            spend,
            cumulative,
            projectedCumulative: null
          });
        } else {
          cumulative += account.avgDailySpend7;
          points.push({
            date: dateKey,
            spend: 0,
            cumulative: 0,
            projectedCumulative: cumulative
          });
        }
      }
      trendMap[account.key] = points;
    }

    const totals = accounts.reduce(
      (acc, account) => {
        acc.targetTotal += account.target;
        acc.monthToDateSpend += account.monthToDateSpend;
        acc.avgDailySpend7 += account.avgDailySpend7;
        acc.forecastedMonthEndSpend += account.forecastedMonthEndSpend;
        return acc;
      },
      {
        targetTotal: 0,
        monthToDateSpend: 0,
        avgDailySpend7: 0,
        forecastedMonthEndSpend: 0
      }
    );

    const remainingBudget = totals.targetTotal > 0
      ? Math.max(0, totals.targetTotal - totals.monthToDateSpend)
      : totals.monthToDateSpend;
    const remainingDailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : 0;

    const optimization: OptimizationRow[] = [];
    const weights = accounts.map((account) => {
      const score = account.roas7 * (1 + account.convRate7 * 2);
      return score > 0 ? score : 0.01;
    });
    const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;

    accounts.forEach((account, index) => {
      const optimizedAvgDailySpend = remainingDailyBudget > 0
        ? remainingDailyBudget * (weights[index] / weightSum)
        : account.avgDailySpend7;

      optimization.push({
        key: account.key,
        customerName: account.customerName,
        source: account.source,
        monthToDateSpend: account.monthToDateSpend,
        avgDailySpend7: account.avgDailySpend7,
        optimizedAvgDailySpend,
        roas7: account.roas7,
        convRate7: account.convRate7
      });
    });

    const response: MetricsResponse = {
      meta: {
        latestDate: latestDate.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
        daysElapsed,
        remainingDays
      },
      totals,
      accounts,
      trends: trendMap,
      optimization
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to load metrics' },
      { status: 500 }
    );
  }
}
