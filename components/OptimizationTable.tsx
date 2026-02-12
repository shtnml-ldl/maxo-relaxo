'use client';

import { useState } from 'react';
import { OptimizationRow } from '@/lib/types';

interface OptimizationTableProps {
  rows: OptimizationRow[];
  meta: {
    latestDate: string;
    monthStart: string;
    maxDateInCurrentMonth: string;
    last14Start: string;
    last30Start: string;
    last60Start: string;
  };
}

export function OptimizationTable({ rows, meta }: OptimizationTableProps) {
  const [showDetails, setShowDetails] = useState(false);
  const formatCurrency = (value: number) =>
    `€ ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const formatRoas = (value: number, spend: number) => {
    if (spend <= 0) return 'N/A';
    const percent = value * 100;
    if (percent < 10) {
      return `${percent.toFixed(1)}%`;
    }
    return `${percent.toFixed(0)}%`;
  };
  const formatDelta = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formatCurrency(Math.abs(value))}`;
  };
  const actionClass = (action: OptimizationRow['action']) => {
    if (action === 'Increase') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action === 'Decrease') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-lg text-ink">Optimized allocation</h3>
          <p className="text-sm text-gray-500">
            Recommended daily spend to maximize weighted ROAS and revenue
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Dates included: MTD {meta.monthStart} to {meta.latestDate}
          </p>
          <p className="text-xs text-gray-400">
            Max date found in current month: {meta.maxDateInCurrentMonth}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          {showDetails ? 'Hide trend details' : 'Show trend details'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-right">Spend MTD</th>
              <th className="px-4 py-3 text-right">Avg Daily (7d)</th>
              <th className="px-4 py-3 text-right">Optimized Avg Daily</th>
              <th className="px-4 py-3 text-right">Delta</th>
              <th className="px-4 py-3 text-right">ROAS 30d</th>
              <th className="px-4 py-3 text-right">Action</th>
              {showDetails && (
                <>
                  <th className="px-4 py-3 text-right">ROAS 14d</th>
                  <th className="px-4 py-3 text-right">ROAS 60d</th>
                  <th className="px-4 py-3 text-right">Spend 14/30/60</th>
                  <th className="px-4 py-3 text-right">Trend</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const delta = row.optimizedAvgDailySpend - row.avgDailySpend7;
              const deltaPercent = row.avgDailySpend7 > 0 ? (delta / row.avgDailySpend7) * 100 : 0;
              return (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-ink">
                    {row.customerName} - {row.source}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.monthToDateSpend)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.avgDailySpend7)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-night">
                    {formatCurrency(row.optimizedAvgDailySpend)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatDelta(delta)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {row.avgDailySpend7 > 0 ? `${deltaPercent.toFixed(0)}%` : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatRoas(row.roas30, row.spend30)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${actionClass(
                        row.action
                      )}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  {showDetails && (
                    <>
                      <td className="px-4 py-3 text-right">{formatRoas(row.roas14, row.spend14)}</td>
                      <td className="px-4 py-3 text-right">{formatRoas(row.roas60, row.spend60)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        <div>14d {formatCurrency(row.spend14)}</div>
                        <div>30d {formatCurrency(row.spend30)}</div>
                        <div>60d {formatCurrency(row.spend60)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full border text-xs text-gray-600">
                          {row.trend}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
