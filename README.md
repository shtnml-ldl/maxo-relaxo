# Maxo Relaxo

Streamlined pacing and optimization dashboard driven by Google Sheets.

## Setup

1) Install dependencies

```bash
npm install
```

2) Configure environment

Create `.env.local` with:

```
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account", ...}
```

3) Run the app

```bash
npm run dev
```

## Sheet expectations

This app reads **all sheets** in the workbook. Each sheet can contain:

Data columns (required for spend + bookings):
- `customer_name` (account name)
- `date`
- `source` (bing or google)
- `campaign_name`
- `campaign_id` (optional)
- `clicks`
- `impressions`
- `number_of_events` (bookings)
- `event_value` (booking value)
- `spend`

Target columns (optional, any sheet):
- `target`, `monthly_target`, `target_spend`, or `monthly_budget`

Targets are matched by `customer_name` and `source` (if present).

## Outputs

- Account pacing table (MTD spend vs target, avg daily 7d, forecasted month-end).
- Trend line chart (cumulative MTD + projected spend).
- Optimization table (recommended daily spend for remaining days to maximize weighted ROAS and revenue).
