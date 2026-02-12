'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { AccountSummary, TrendPoint } from '@/lib/types';

interface TrendChartProps {
  accounts: AccountSummary[];
  trends: Record<string, TrendPoint[]>;
}

export function TrendChart({ accounts, trends }: TrendChartProps) {
  const [selectedKey, setSelectedKey] = useState(accounts[0]?.key || '');

  const series = useMemo(() => trends[selectedKey] || [], [trends, selectedKey]);

  const formatCurrency = (value: number) =>
    `€ ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-lg text-ink">Spend trend</h3>
          <p className="text-sm text-gray-500">Cumulative month-to-date with forecast extension</p>
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={selectedKey}
          onChange={(event) => setSelectedKey(event.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.key} value={account.key}>
              {account.customerName} - {account.source}
            </option>
          ))}
        </select>
      </div>
      <div className="p-4 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#0ea978"
              strokeWidth={2}
              dot={false}
              name="Cumulative spend"
            />
            <Line
              type="monotone"
              dataKey="projectedCumulative"
              stroke="#f26522"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Projected spend"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
