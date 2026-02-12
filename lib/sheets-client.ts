import { google } from 'googleapis';
import { DataRow, MediumType, SourcePlatform } from './types';

type TargetRow = {
  customerName: string;
  source?: SourcePlatform;
  medium?: MediumType;
  target: number;
};

export class SheetsClient {
  private sheets;
  private sheetId: string;

  constructor() {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.sheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  async fetchAllSheets(): Promise<{
    rows: DataRow[];
    targets: TargetRow[];
    sheetNames: string[];
  }> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.sheetId
    });
    const sheetNames = (meta.data.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title));

    const rows: DataRow[] = [];
    const targets: TargetRow[] = [];

    for (const sheetName of sheetNames) {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${sheetName}!A:Z`
      });

      const values = response.data.values || [];
      if (values.length < 2) continue;

      const headers = values[0].map((header) => normalizeHeader(header));
      const dataRows = values.slice(1);

      const hasDataColumns =
        headerIndex(headers, 'customer_name') !== -1 &&
        headerIndex(headers, 'date') !== -1 &&
        headerIndex(headers, 'source') !== -1 &&
        headerIndex(headers, 'spend') !== -1;

      const hasTargetColumns =
        headerIndex(headers, 'customer_name') !== -1 &&
        (headerIndex(headers, 'target') !== -1 ||
          headerIndex(headers, 'monthly_target') !== -1 ||
          headerIndex(headers, 'target_spend') !== -1 ||
          headerIndex(headers, 'monthly_budget') !== -1);

      if (hasTargetColumns) {
        for (const row of dataRows) {
          const customerName = normalizeText(getCell(row, headers, 'customer_name'));
          if (!customerName) continue;
          const sourceRaw = normalizeText(getCell(row, headers, 'source'));
          const source = sourceRaw ? normalizeSource(sourceRaw) : undefined;
          if (sourceRaw && !source) continue;
          const mediumRaw = normalizeText(getCell(row, headers, 'medium'));
          const medium = mediumRaw ? normalizeMedium(mediumRaw) : undefined;
          if (mediumRaw && !medium) continue;
          const targetValue =
            parseNumber(getCell(row, headers, 'target')) ||
            parseNumber(getCell(row, headers, 'monthly_target')) ||
            parseNumber(getCell(row, headers, 'target_spend')) ||
            parseNumber(getCell(row, headers, 'monthly_budget'));

          if (targetValue <= 0) continue;

          targets.push({
            customerName,
            source: source ?? undefined,
            medium: medium ?? undefined,
            target: targetValue
          });
        }
      }

      if (!hasDataColumns) continue;

      for (const row of dataRows) {
        const customerName = normalizeText(getCell(row, headers, 'customer_name'));
        const dateRaw = normalizeText(getCell(row, headers, 'date'));
        const sourceRaw = normalizeText(getCell(row, headers, 'source'));
        const mediumRaw = normalizeText(getCell(row, headers, 'medium'));
        const spend = parseNumber(getCell(row, headers, 'spend'));
        if (!customerName || !dateRaw || !sourceRaw || !mediumRaw) continue;

        const source = normalizeSource(sourceRaw);
        if (!source) continue;
        const medium = normalizeMedium(mediumRaw);
        if (!medium) continue;
        const date = parseDate(dateRaw);
        if (!date) continue;

        rows.push({
          customerName,
          source,
          medium,
          date,
          campaignName: normalizeText(getCell(row, headers, 'campaign_name')) || 'Unknown',
          campaignId: getCell(row, headers, 'campaign_id') || undefined,
          clicks: parseNumber(getCell(row, headers, 'clicks')),
          impressions: parseNumber(getCell(row, headers, 'impressions')),
          numberOfEvents: parseNumber(getCell(row, headers, 'number_of_events')),
          eventValue: parseNumber(getCell(row, headers, 'event_value')),
          spend
        });
      }
    }

    return { rows, targets, sheetNames };
  }
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .replace(/[^\w]/g, '');
}

function headerIndex(headers: string[], key: string): number {
  const normalizedKey = normalizeHeader(key);
  return headers.findIndex((header) => header === normalizedKey);
}

function getCell(row: any[], headers: string[], key: string): string {
  const idx = headerIndex(headers, key);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[,\\u00A3\\u20AC$]/g, '').trim();
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function normalizeSource(value: string): SourcePlatform | null {
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('bing')) return 'Bing';
  if (normalized.includes('google')) return 'Google';
  return null;
}

function normalizeMedium(value: string): MediumType | null {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'cpc') return 'cpc';
  return null;
}

function normalizeText(value: string): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const cleaned = String(value).trim();
  let normalized = cleaned;
  if (normalized.startsWith("'")) {
    normalized = normalized.slice(1);
  }
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  if (normalized.includes('/')) {
    const parts = normalized.split('/');
    if (parts.length === 3) {
      const month = Number(parts[0]);
      const day = Number(parts[1]);
      const year = Number(parts[2]);
      if (month > 12) {
        return new Date(year, day - 1, month);
      }
      return new Date(year, month - 1, day);
    }
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
