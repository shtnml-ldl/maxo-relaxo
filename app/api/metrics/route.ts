import { NextResponse } from 'next/server';
import { SheetsClient } from '@/lib/sheets-client';
import {
  AccountSummary,
  CampaignOptimizationRow,
  MediumType,
  MetricsResponse,
  OptimizationRow,
  TrendPoint
} from '@/lib/types';

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

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const latestInCurrentMonth = rows
      .map((row) => row.date)
      .filter((date) => date >= currentMonthStart && date <= currentMonthEnd)
      .reduce((max, date) => (date > max ? date : max), currentMonthStart);
    const latestDate = latestInCurrentMonth <= now ? latestInCurrentMonth : now;
    const monthStart = currentMonthStart;
    const monthEnd = currentMonthEnd;
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.max(1, Math.floor((latestDate.getTime() - monthStart.getTime()) / msPerDay) + 1);
    const remainingDays = Math.max(0, Math.ceil((monthEnd.getTime() - latestDate.getTime()) / msPerDay));

    const targetMap = new Map<string, number>();
    for (const target of targets) {
      const key = `${target.customerName}|${target.source ?? 'ALL'}|${target.medium ?? 'ALL'}`;
      targetMap.set(key, target.target);
    }

    const accountMap = new Map<string, AccountSummary>();
    const trendMap: Record<string, TrendPoint[]> = {};

    const last7Start = new Date(latestDate);
    last7Start.setDate(last7Start.getDate() - 6);
    const last30Start = new Date(latestDate);
    last30Start.setDate(last30Start.getDate() - 29);
    const last14Start = new Date(latestDate);
    last14Start.setDate(last14Start.getDate() - 13);
    const last60Start = new Date(latestDate);
    last60Start.setDate(last60Start.getDate() - 59);

    const excludedCampaignRegex = /\|\s*(BR|PK|DMG|YT)\b/i;

    const dailySpendMap = new Map<string, Map<string, number>>();
    const last30Map = new Map<
      string,
      { spend: number; revenue: number; bookings: number; clicks: number }
    >();
    const optimizationAccountMap = new Map<
      string,
      {
        key: string;
        customerName: string;
        source: AccountSummary['source'];
        target: number;
        monthToDateSpend: number;
        monthToDateRevenue: number;
        monthToDateBookings: number;
        monthToDateClicks: number;
        last7DaySpend: number;
        last7DayRevenue: number;
        last7DayBookings: number;
        last7DayClicks: number;
      }
    >();
    const optimizationDailySpendMap = new Map<string, Map<string, number>>();
    const optimizationWindowMap = new Map<
      string,
      {
        spend14: number;
        spend30: number;
        spend60: number;
        revenue14: number;
        revenue30: number;
        revenue60: number;
        bookings14: number;
        bookings30: number;
        bookings60: number;
        clicks14: number;
        clicks30: number;
        clicks60: number;
      }
    >();
    const campaignMap = new Map<
      string,
      {
        key: string;
        accountKey: string;
        customerName: string;
        source: AccountSummary['source'];
        medium: MediumType;
        campaignName: string;
        last7DaySpend: number;
        last7DayRevenue: number;
        last7DayBookings: number;
        last7DayClicks: number;
      }
    >();
    const campaignDailySpendMap = new Map<string, Map<string, number>>();
    const campaignWindowMap = new Map<
      string,
      {
        spend14: number;
        spend30: number;
        spend60: number;
        revenue14: number;
        revenue30: number;
        revenue60: number;
        bookings14: number;
        bookings30: number;
        bookings60: number;
        clicks14: number;
        clicks30: number;
        clicks60: number;
      }
    >();

    for (const row of rows) {
      const customerNameKey = row.customerName.trim().toLowerCase();
      if (customerNameKey === 'hof van saksen nl' || customerNameKey === 'landal uk') {
        continue;
      }
      const key = `${row.customerName}|${row.source}|${row.medium}`;
      if (!accountMap.has(key)) {
        const targetKey =
          targetMap.get(`${row.customerName}|${row.source}|${row.medium}`) ??
          targetMap.get(`${row.customerName}|${row.source}|ALL`) ??
          targetMap.get(`${row.customerName}|ALL|${row.medium}`) ??
          targetMap.get(`${row.customerName}|ALL|ALL`) ??
          0;
        accountMap.set(key, {
          key,
          customerName: row.customerName,
          source: row.source,
          target: targetKey,
          monthToDateSpend: 0,
          monthToDateRevenue: 0,
          monthToDateBookings: 0,
          monthToDateClicks: 0,
          avgDailySpend7: 0,
          forecastedMonthEndSpend: 0,
          last7DaySpend: 0,
          last7DayRevenue: 0,
          last7DayBookings: 0,
          last7DayClicks: 0,
          roas30: 0,
          convRate30: 0,
          percentToTarget: 0
        });
      }

      const account = accountMap.get(key)!;
      if (row.date >= monthStart && row.date <= latestDate) {
        account.monthToDateSpend += row.spend;
        account.monthToDateRevenue += row.eventValue;
        account.monthToDateBookings += row.numberOfEvents;
        account.monthToDateClicks += row.clicks;
      }

      if (row.date >= last7Start && row.date <= latestDate) {
        account.last7DaySpend += row.spend;
        account.last7DayRevenue += row.eventValue;
        account.last7DayBookings += row.numberOfEvents;
        account.last7DayClicks += row.clicks;
      }

      if (row.date >= last30Start && row.date <= latestDate) {
        const last30 = last30Map.get(key) || {
          spend: 0,
          revenue: 0,
          bookings: 0,
          clicks: 0
        };
        last30.spend += row.spend;
        last30.revenue += row.eventValue;
        last30.bookings += row.numberOfEvents;
        last30.clicks += row.clicks;
        last30Map.set(key, last30);
      }

      const includeOptimization = !excludedCampaignRegex.test(row.campaignName);
      const dayKey = row.date.toISOString().split('T')[0];
      if (includeOptimization) {
        if (!optimizationAccountMap.has(key)) {
          const targetKey =
            targetMap.get(`${row.customerName}|${row.source}|${row.medium}`) ??
            targetMap.get(`${row.customerName}|${row.source}|ALL`) ??
            targetMap.get(`${row.customerName}|ALL|${row.medium}`) ??
            targetMap.get(`${row.customerName}|ALL|ALL`) ??
            0;
          optimizationAccountMap.set(key, {
            key,
            customerName: row.customerName,
            source: row.source,
            target: targetKey,
            monthToDateSpend: 0,
            monthToDateRevenue: 0,
            monthToDateBookings: 0,
            monthToDateClicks: 0,
            last7DaySpend: 0,
            last7DayRevenue: 0,
            last7DayBookings: 0,
            last7DayClicks: 0
          });
        }

        const optimizationAccount = optimizationAccountMap.get(key)!;
        if (row.date >= monthStart && row.date <= latestDate) {
          optimizationAccount.monthToDateSpend += row.spend;
          optimizationAccount.monthToDateRevenue += row.eventValue;
          optimizationAccount.monthToDateBookings += row.numberOfEvents;
          optimizationAccount.monthToDateClicks += row.clicks;
        }

        if (row.date >= last7Start && row.date <= latestDate) {
          optimizationAccount.last7DaySpend += row.spend;
          optimizationAccount.last7DayRevenue += row.eventValue;
          optimizationAccount.last7DayBookings += row.numberOfEvents;
          optimizationAccount.last7DayClicks += row.clicks;
        }

        if (!optimizationDailySpendMap.has(key)) {
          optimizationDailySpendMap.set(key, new Map<string, number>());
        }
        const optimizationPerDay = optimizationDailySpendMap.get(key)!;
        optimizationPerDay.set(dayKey, (optimizationPerDay.get(dayKey) || 0) + row.spend);

        const window = optimizationWindowMap.get(key) || {
          spend14: 0,
          spend30: 0,
          spend60: 0,
          revenue14: 0,
          revenue30: 0,
          revenue60: 0,
          bookings14: 0,
          bookings30: 0,
          bookings60: 0,
          clicks14: 0,
          clicks30: 0,
          clicks60: 0
        };

        if (row.date >= last14Start && row.date <= latestDate) {
          window.spend14 += row.spend;
          window.revenue14 += row.eventValue;
          window.bookings14 += row.numberOfEvents;
          window.clicks14 += row.clicks;
        }
        if (row.date >= last30Start && row.date <= latestDate) {
          window.spend30 += row.spend;
          window.revenue30 += row.eventValue;
          window.bookings30 += row.numberOfEvents;
          window.clicks30 += row.clicks;
        }
        if (row.date >= last60Start && row.date <= latestDate) {
          window.spend60 += row.spend;
          window.revenue60 += row.eventValue;
          window.bookings60 += row.numberOfEvents;
          window.clicks60 += row.clicks;
        }
        optimizationWindowMap.set(key, window);

        const campaignKey = `${key}|${row.campaignName}`;
        if (!campaignMap.has(campaignKey)) {
          campaignMap.set(campaignKey, {
            key: campaignKey,
            accountKey: key,
            customerName: row.customerName,
            source: row.source,
            medium: row.medium,
            campaignName: row.campaignName,
            last7DaySpend: 0,
            last7DayRevenue: 0,
            last7DayBookings: 0,
            last7DayClicks: 0
          });
        }

        const campaign = campaignMap.get(campaignKey)!;
        if (row.date >= last7Start && row.date <= latestDate) {
          campaign.last7DaySpend += row.spend;
          campaign.last7DayRevenue += row.eventValue;
          campaign.last7DayBookings += row.numberOfEvents;
          campaign.last7DayClicks += row.clicks;
        }

        if (!campaignDailySpendMap.has(campaignKey)) {
          campaignDailySpendMap.set(campaignKey, new Map<string, number>());
        }
        const campaignPerDay = campaignDailySpendMap.get(campaignKey)!;
        campaignPerDay.set(dayKey, (campaignPerDay.get(dayKey) || 0) + row.spend);

        const campaignWindow = campaignWindowMap.get(campaignKey) || {
          spend14: 0,
          spend30: 0,
          spend60: 0,
          revenue14: 0,
          revenue30: 0,
          revenue60: 0,
          bookings14: 0,
          bookings30: 0,
          bookings60: 0,
          clicks14: 0,
          clicks30: 0,
          clicks60: 0
        };

        if (row.date >= last14Start && row.date <= latestDate) {
          campaignWindow.spend14 += row.spend;
          campaignWindow.revenue14 += row.eventValue;
          campaignWindow.bookings14 += row.numberOfEvents;
          campaignWindow.clicks14 += row.clicks;
        }
        if (row.date >= last30Start && row.date <= latestDate) {
          campaignWindow.spend30 += row.spend;
          campaignWindow.revenue30 += row.eventValue;
          campaignWindow.bookings30 += row.numberOfEvents;
          campaignWindow.clicks30 += row.clicks;
        }
        if (row.date >= last60Start && row.date <= latestDate) {
          campaignWindow.spend60 += row.spend;
          campaignWindow.revenue60 += row.eventValue;
          campaignWindow.bookings60 += row.numberOfEvents;
          campaignWindow.clicks60 += row.clicks;
        }
        campaignWindowMap.set(campaignKey, campaignWindow);
      }

      if (!dailySpendMap.has(key)) {
        dailySpendMap.set(key, new Map<string, number>());
      }
      const perDay = dailySpendMap.get(key)!;
      perDay.set(dayKey, (perDay.get(dayKey) || 0) + row.spend);
    }

    const accounts: AccountSummary[] = [];
    Array.from(accountMap.values()).forEach((account) => {
      const dailySpend = dailySpendMap.get(account.key) || new Map<string, number>();
      const activeDays7 = Array.from(dailySpend.keys()).filter((dateStr) => {
        const date = new Date(dateStr);
        return date >= last7Start && date <= latestDate;
      }).length;

      account.avgDailySpend7 = activeDays7 > 0 ? account.last7DaySpend / activeDays7 : 0;
      account.forecastedMonthEndSpend = account.monthToDateSpend + (account.avgDailySpend7 * remainingDays);
      const last30 = last30Map.get(account.key) || {
        spend: 0,
        revenue: 0,
        bookings: 0,
        clicks: 0
      };
      const roas30 = last30.spend > 0 ? last30.revenue / last30.spend : 0;
      const roasMtd = account.monthToDateSpend > 0 ? account.monthToDateRevenue / account.monthToDateSpend : 0;
      const convRate30 = last30.clicks > 0 ? last30.bookings / last30.clicks : 0;
      const convRateMtd = account.monthToDateClicks > 0
        ? account.monthToDateBookings / account.monthToDateClicks
        : 0;
      account.roas30 = roas30 > 0 ? roas30 : roasMtd;
      account.convRate30 = convRate30 > 0 ? convRate30 : convRateMtd;
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
    });

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

    const optimizationAccounts = Array.from(optimizationAccountMap.values()).map((account) => {
      const dailySpend = optimizationDailySpendMap.get(account.key) || new Map<string, number>();
      const activeDays7 = Array.from(dailySpend.keys()).filter((dateStr) => {
        const date = new Date(dateStr);
        return date >= last7Start && date <= latestDate;
      }).length;

      const avgDailySpend7 = activeDays7 > 0 ? account.last7DaySpend / activeDays7 : 0;
      const window = optimizationWindowMap.get(account.key) || {
        spend14: 0,
        spend30: 0,
        spend60: 0,
        revenue14: 0,
        revenue30: 0,
        revenue60: 0,
        bookings14: 0,
        bookings30: 0,
        bookings60: 0,
        clicks14: 0,
        clicks30: 0,
        clicks60: 0
      };

      const roas14 = window.spend14 > 0 ? window.revenue14 / window.spend14 : 0;
      const roas30 = window.spend30 > 0 ? window.revenue30 / window.spend30 : 0;
      const roas60 = window.spend60 > 0 ? window.revenue60 / window.spend60 : 0;
      const roasMtd = account.monthToDateSpend > 0
        ? account.monthToDateRevenue / account.monthToDateSpend
        : 0;
      const roas30Effective = roas30 > 0 ? roas30 : roasMtd;
      const convRate30 = window.clicks30 > 0 ? window.bookings30 / window.clicks30 : 0;
      const convRateMtd = account.monthToDateClicks > 0
        ? account.monthToDateBookings / account.monthToDateClicks
        : 0;
      const convRate30Effective = convRate30 > 0 ? convRate30 : convRateMtd;

      const baseDailyForCap = avgDailySpend7 > 0 ? avgDailySpend7 : (window.spend30 > 0 ? window.spend30 / 30 : 0);
      const hasTrendData = window.spend14 > 0 && window.spend30 > 0 && window.spend60 > 0;
      let trend: OptimizationRow['trend'] = 'Flat';
      if (hasTrendData) {
        if (roas14 > roas30 && roas30 > roas60) {
          trend = 'Improving';
        } else if (roas14 < roas30 && roas30 < roas60) {
          trend = 'Declining';
        }
      }

      return {
        key: account.key,
        customerName: account.customerName,
        source: account.source,
        target: account.target,
        monthToDateSpend: account.monthToDateSpend,
        avgDailySpend7,
        roas14,
        roas30,
        roas60,
        roas30Effective,
        convRate30Effective,
        spend14: window.spend14,
        spend30: window.spend30,
        spend60: window.spend60,
        baseDailyForCap,
        trend
      };
    });

    const optimizationTotals = optimizationAccounts.reduce(
      (acc, account) => {
        acc.targetTotal += account.target;
        acc.monthToDateSpend += account.monthToDateSpend;
        acc.avgDailySpend7 += account.avgDailySpend7;
        return acc;
      },
      {
        targetTotal: 0,
        monthToDateSpend: 0,
        avgDailySpend7: 0
      }
    );

    const optimizationRunRateDailyBudget = optimizationTotals.avgDailySpend7 > 0
      ? optimizationTotals.avgDailySpend7
      : (daysElapsed > 0 ? optimizationTotals.monthToDateSpend / daysElapsed : 0);

    let optimizationDailyBudget = optimizationRunRateDailyBudget;
    if (optimizationTotals.targetTotal > 0 && remainingDays > 0) {
      const remainingDailyBudget = Math.max(0, optimizationTotals.targetTotal - optimizationTotals.monthToDateSpend)
        / remainingDays;
      optimizationDailyBudget = Math.max(remainingDailyBudget, optimizationRunRateDailyBudget);
    }

    const roasThreshold = 9;
    const maxShift = 0.25;
    const optimization: OptimizationRow[] = [];
    const weights = optimizationAccounts.map((account) => {
      const score = account.roas30Effective * (1 + account.convRate30Effective * 2);
      return score > 0 ? score : 0.01;
    });
    const caps = optimizationAccounts.map((account, index) => {
      const base = account.baseDailyForCap;
      return {
        weight: weights[index],
        min: Math.max(0, base * (1 - maxShift)),
        max: Math.max(0, base * (1 + maxShift))
      };
    });

    const allocateWithCaps = (
      total: number,
      items: { weight: number; min: number; max: number }[]
    ) => {
      const weightSum = items.reduce((sum, item) => sum + item.weight, 0) || 1;
      const allocations = items.map((cap) => ({
        weight: cap.weight,
        min: cap.min,
        max: cap.max,
        allocation: total * (cap.weight / weightSum)
      }));
      allocations.forEach((item) => {
        if (item.allocation < item.min) item.allocation = item.min;
        if (item.allocation > item.max) item.allocation = item.max;
      });

      let remaining = total - allocations.reduce((sum, item) => sum + item.allocation, 0);
      for (let i = 0; i < 10 && Math.abs(remaining) > 0.01; i += 1) {
        const adjustable = allocations.filter((item) =>
          remaining > 0 ? item.allocation < item.max - 0.01 : item.allocation > item.min + 0.01
        );
        if (adjustable.length === 0) break;
        const adjustableWeightSum = adjustable.reduce((sum, item) => sum + item.weight, 0) || 1;
        for (const item of adjustable) {
          const delta = remaining * (item.weight / adjustableWeightSum);
          let next = item.allocation + delta;
          if (remaining > 0 && next > item.max) next = item.max;
          if (remaining < 0 && next < item.min) next = item.min;
          remaining -= next - item.allocation;
          item.allocation = next;
        }
      }

      return allocations.map((item) => item.allocation);
    };

    const allocations = allocateWithCaps(optimizationDailyBudget, caps);

    optimizationAccounts.forEach((account, index) => {
      const optimizedAvgDailySpend = allocations[index] ?? account.avgDailySpend7;
      let action: OptimizationRow['action'] = 'Hold';
      if (account.roas30Effective >= roasThreshold && optimizedAvgDailySpend > account.avgDailySpend7) {
        action = 'Increase';
      } else if (account.roas30Effective < roasThreshold && optimizedAvgDailySpend < account.avgDailySpend7) {
        action = 'Decrease';
      }

      optimization.push({
        key: account.key,
        customerName: account.customerName,
        source: account.source,
        monthToDateSpend: account.monthToDateSpend,
        avgDailySpend7: account.avgDailySpend7,
        optimizedAvgDailySpend,
        roas14: account.roas14,
        roas30: account.roas30,
        roas60: account.roas60,
        spend14: account.spend14,
        spend30: account.spend30,
        spend60: account.spend60,
        trend: account.trend,
        action
      });
    });

    const campaignOptimization: CampaignOptimizationRow[] = [];
    const accountBudgetMap = new Map(
      optimizationAccounts.map((account) => [account.key, account.avgDailySpend7])
    );

    const campaignSummaries = Array.from(campaignMap.values()).map((campaign) => {
      const dailySpend = campaignDailySpendMap.get(campaign.key) || new Map<string, number>();
      const activeDays7 = Array.from(dailySpend.keys()).filter((dateStr) => {
        const date = new Date(dateStr);
        return date >= last7Start && date <= latestDate;
      }).length;

      const avgDailySpend7 = activeDays7 > 0 ? campaign.last7DaySpend / activeDays7 : 0;
      const window = campaignWindowMap.get(campaign.key) || {
        spend14: 0,
        spend30: 0,
        spend60: 0,
        revenue14: 0,
        revenue30: 0,
        revenue60: 0,
        bookings14: 0,
        bookings30: 0,
        bookings60: 0,
        clicks14: 0,
        clicks30: 0,
        clicks60: 0
      };

      const roas14 = window.spend14 > 0 ? window.revenue14 / window.spend14 : 0;
      const roas30 = window.spend30 > 0 ? window.revenue30 / window.spend30 : 0;
      const roas60 = window.spend60 > 0 ? window.revenue60 / window.spend60 : 0;
      const convRate30 = window.clicks30 > 0 ? window.bookings30 / window.clicks30 : 0;
      const baseDailyForCap = avgDailySpend7 > 0 ? avgDailySpend7 : (window.spend30 > 0 ? window.spend30 / 30 : 0);
      const hasTrendData = window.spend14 > 0 && window.spend30 > 0 && window.spend60 > 0;
      let trend: CampaignOptimizationRow['trend'] = 'Flat';
      if (hasTrendData) {
        if (roas14 > roas30 && roas30 > roas60) {
          trend = 'Improving';
        } else if (roas14 < roas30 && roas30 < roas60) {
          trend = 'Declining';
        }
      }

      return {
        key: campaign.key,
        accountKey: campaign.accountKey,
        customerName: campaign.customerName,
        source: campaign.source,
        medium: campaign.medium,
        campaignName: campaign.campaignName,
        avgDailySpend7,
        roas14,
        roas30,
        roas60,
        spend14: window.spend14,
        spend30: window.spend30,
        spend60: window.spend60,
        convRate30,
        baseDailyForCap,
        trend
      };
    });

    const campaignsByAccount = new Map<string, typeof campaignSummaries>();
    campaignSummaries.forEach((campaign) => {
      if (!campaignsByAccount.has(campaign.accountKey)) {
        campaignsByAccount.set(campaign.accountKey, []);
      }
      campaignsByAccount.get(campaign.accountKey)!.push(campaign);
    });

    campaignsByAccount.forEach((campaigns, accountKey) => {
      const accountBudget = accountBudgetMap.get(accountKey) ?? 0;
      if (campaigns.length === 0) return;

      const weights = campaigns.map((campaign) => {
        const score = campaign.roas30 * (1 + campaign.convRate30 * 2);
        return score > 0 ? score : 0.01;
      });

      const caps = campaigns.map((campaign, index) => {
        const base = campaign.baseDailyForCap;
        return {
          weight: weights[index],
          min: Math.max(0, base * (1 - maxShift)),
          max: Math.max(0, base * (1 + maxShift))
        };
      });

      const allocations = accountBudget > 0 ? allocateWithCaps(accountBudget, caps) : [];

      campaigns.forEach((campaign, index) => {
        const optimizedAvgDailySpend = allocations[index] ?? campaign.avgDailySpend7;
        let action: CampaignOptimizationRow['action'] = 'Hold';
        if (campaign.roas30 >= roasThreshold && optimizedAvgDailySpend > campaign.avgDailySpend7) {
          action = 'Increase';
        } else if (campaign.roas30 < roasThreshold && optimizedAvgDailySpend < campaign.avgDailySpend7) {
          action = 'Decrease';
        }

        campaignOptimization.push({
          key: campaign.key,
          accountKey: campaign.accountKey,
          customerName: campaign.customerName,
          source: campaign.source,
          medium: campaign.medium,
          campaignName: campaign.campaignName,
          avgDailySpend7: campaign.avgDailySpend7,
          optimizedAvgDailySpend,
          roas14: campaign.roas14,
          roas30: campaign.roas30,
          roas60: campaign.roas60,
          spend14: campaign.spend14,
          spend30: campaign.spend30,
          spend60: campaign.spend60,
          trend: campaign.trend,
          action
        });
      });
    });

    const response: MetricsResponse = {
      meta: {
        latestDate: latestDate.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
        maxDateInCurrentMonth: latestInCurrentMonth.toISOString().split('T')[0],
        last7Start: last7Start.toISOString().split('T')[0],
        last14Start: last14Start.toISOString().split('T')[0],
        last30Start: last30Start.toISOString().split('T')[0],
        last60Start: last60Start.toISOString().split('T')[0],
        daysElapsed,
        remainingDays
      },
      totals,
      accounts,
      trends: trendMap,
      optimization,
      campaignOptimization
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
