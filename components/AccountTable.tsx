'use client';

import { AccountSummary } from '@/lib/types';

interface AccountTableProps {
  accounts: AccountSummary[];
}

export function AccountTable({ accounts }: AccountTableProps) {
  const formatCurrency = (value: number) =>
    `€ ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-display text-lg text-ink">Account pacing</h3>
        <p className="text-sm text-gray-500">Spend vs target and projected month-end spend</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-right">Spend MTD</th>
              <th className="px-4 py-3 text-right">Target</th>
              <th className="px-4 py-3 text-right">% to Target</th>
              <th className="px-4 py-3 text-right">Avg Daily (7d)</th>
              <th className="px-4 py-3 text-right">Forecast Month-End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.map((account) => (
              <tr key={account.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-ink">
                  {account.customerName} - {account.source}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(account.monthToDateSpend)}</td>
                <td className="px-4 py-3 text-right">
                  {account.target > 0 ? formatCurrency(account.target) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">
                  {account.target > 0 ? `${(account.percentToTarget * 100).toFixed(1)}%` : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(account.avgDailySpend7)}</td>
                <td className="px-4 py-3 text-right font-semibold text-night">
                  {formatCurrency(account.forecastedMonthEndSpend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
