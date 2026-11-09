import { prisma } from './db';

export interface SystemConfig {
  uiScale: '80' | '100';
  defaultDateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  defaultRowsPerPage: '25' | '50' | '100' | '200' | '500' | 'all';
  currencySymbol: string;
  currencyCode: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  inactivityTimeout: '15' | '30' | '60';
  defaultShipmentMode: string;
  dashboardMetric: 'cbm' | 'value' | 'count';
  sidebarDefault?: 'expanded' | 'collapsed';
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  uiScale: '100',
  defaultDateRange: 'month',
  defaultRowsPerPage: '200',
  currencySymbol: '$',
  currencyCode: 'USD',
  dateFormat: 'YYYY-MM-DD',
  inactivityTimeout: '30',
  defaultShipmentMode: 'Sea FCL',
  dashboardMetric: 'cbm',
};

export async function getSystemConfigFromDb(): Promise<SystemConfig> {
  try {
    const record = await prisma.masterData.findFirst({
      where: {
        category: 'SYSTEM_CONFIG',
        module: 'SYSTEM',
        status: 'Active',
      },
    });

    if (!record || !record.value) {
      return DEFAULT_SYSTEM_CONFIG;
    }

    const parsed = JSON.parse(record.value);
    return { ...DEFAULT_SYSTEM_CONFIG, ...parsed };
  } catch (err) {
    console.error('Failed to load system config from DB:', err);
    return DEFAULT_SYSTEM_CONFIG;
  }
}
