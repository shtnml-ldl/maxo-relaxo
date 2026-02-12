'use client';

import { OptimizationRow } from '@/lib/types';

interface OptimizationTableProps {
  rows: OptimizationRow[];
}

export function OptimizationTable({ rows }: OptimizationTableProps) {
  const formatCurrency = (value: number) =>
    `EUR ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const formatRoas = (value: number) => {
    const percent = value * 100;
    if (percent < 10) {
      return `${percent.toFixed(1)}%`;
    }
    return `${percent.toFixed(0)}%`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-display text-lg text-ink">Optimized allocation</h3>
        <p className="text-sm text-gray-500">
          Recommended daily spend to maximize weighted ROAS and revenue
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-right">Spend MTD</th>
              <th className="px-4 py-3 text-right">Avg Daily (7d)</th>
              <th className="px-4 py-3 text-right">Optimized Avg Daily</th>
              <th className="px-4 py-3 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
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
                  {row.monthToDateSpend > 0 ? formatRoas(row.roas30) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
