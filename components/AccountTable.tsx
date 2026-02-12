'use client';

import { useMemo, useState } from 'react';
import { AccountSummary } from '@/lib/types';

interface AccountTableProps {
  accounts: AccountSummary[];
}

export function AccountTable({ accounts }: AccountTableProps) {
  const formatCurrency = (value: number) =>
    `€ ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const [sortKey, setSortKey] = useState<
    | 'account'
    | 'monthToDateSpend'
    | 'target'
    | 'percentToTarget'
    | 'avgDailySpend7'
    | 'forecastedMonthEndSpend'
    | null
  >(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedAccounts = useMemo(() => {
    if (!sortKey) return accounts;
    const sorted = [...accounts];
    sorted.sort((a, b) => {
      if (sortKey === 'account') {
        const nameA = `${a.customerName} ${a.source}`.toLowerCase();
        const nameB = `${b.customerName} ${b.source}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      const valueA = a[sortKey];
      const valueB = b[sortKey];
      return valueA === valueB ? 0 : valueA > valueB ? 1 : -1;
    });
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [accounts, sortDirection, sortKey]);

  const toggleSort = (key: NonNullable<typeof sortKey>) => {
    if (sortKey === key) {
      setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

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
              <th className="px-4 py-3 text-left">
                <button type="button" className="hover:text-gray-700" onClick={() => toggleSort('account')}>
                  Account
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" className="hover:text-gray-700" onClick={() => toggleSort('monthToDateSpend')}>
                  Spend MTD
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" className="hover:text-gray-700" onClick={() => toggleSort('target')}>
                  Target
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" className="hover:text-gray-700" onClick={() => toggleSort('percentToTarget')}>
                  % to Target
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button type="button" className="hover:text-gray-700" onClick={() => toggleSort('avgDailySpend7')}>
                  Avg Daily (7d)
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  type="button"
                  className="hover:text-gray-700"
                  onClick={() => toggleSort('forecastedMonthEndSpend')}
                >
                  Forecast Month-End
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedAccounts.map((account) => (
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
