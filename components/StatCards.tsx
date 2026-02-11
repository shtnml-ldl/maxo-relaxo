'use client';

interface StatCardsProps {
  targetTotal: number;
  monthToDateSpend: number;
  avgDailySpend7: number;
  forecastedMonthEndSpend: number;
}

export function StatCards({
  targetTotal,
  monthToDateSpend,
  avgDailySpend7,
  forecastedMonthEndSpend
}: StatCardsProps) {
  const formatCurrency = (value: number) =>
    `EUR ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const percentToTarget = targetTotal > 0 ? (monthToDateSpend / targetTotal) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs uppercase text-gray-500">Spend MTD</p>
        <p className="font-display text-xl text-ink">{formatCurrency(monthToDateSpend)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs uppercase text-gray-500">Target total</p>
        <p className="font-display text-xl text-ink">
          {targetTotal > 0 ? formatCurrency(targetTotal) : 'N/A'}
        </p>
        <p className="text-xs text-gray-400">
          {targetTotal > 0 ? `${percentToTarget.toFixed(1)}% to target` : 'No target loaded'}
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs uppercase text-gray-500">Avg daily spend (7d)</p>
        <p className="font-display text-xl text-ink">{formatCurrency(avgDailySpend7)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs uppercase text-gray-500">Forecast month-end</p>
        <p className="font-display text-xl text-ink">{formatCurrency(forecastedMonthEndSpend)}</p>
      </div>
    </div>
  );
}
