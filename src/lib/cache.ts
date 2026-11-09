import { prisma } from './db';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

export async function getCachedMasterData(options?: {
  categories?: string[];
  module?: string;
  status?: string;
}) {
  const categoriesKey = options?.categories?.sort().join(',') || 'ALL';
  const moduleKey = options?.module || 'ALL';
  const statusKey = options?.status || 'Active';
  const cacheKey = `master_data_${categoriesKey}_${moduleKey}_${statusKey}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const where: any = {};
  if (options?.categories && options.categories.length > 0) {
    where.category = { in: options.categories };
  }
  if (options?.module && options.module !== 'ALL') {
    where.module = options.module;
  }
  if (options?.status) {
    where.status = options.status;
  }

  try {
    const data = await prisma.masterData.findMany({
      where,
      select: { id: true, category: true, value: true, module: true, status: true },
      orderBy: [{ category: 'asc' }, { value: 'asc' }],
    });

    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return data;
  } catch (err) {
    // If cache had previous stale data, return it during network glitch
    if (cached) return cached.data;
    throw err;
  }
}

export async function getCachedFieldConfigs(module: string = 'SHIPMENT') {
  const cacheKey = `field_configs_${module}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const data = await prisma.fieldConfig.findMany({
      where: { isActive: true, module },
      orderBy: { displayOrder: 'asc' },
    });

    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return data;
  } catch (err) {
    if (cached) return cached.data;
    throw err;
  }
}

export function invalidateDataCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function getCachedSystemConfig() {
  const cacheKey = 'system_configuration';
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { getSystemConfigFromDb } = await import('./config');
  const config = await getSystemConfigFromDb();

  memoryCache.set(cacheKey, {
    data: config,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });

  return config;
}

export function invalidateSystemConfigCache() {
  memoryCache.delete('system_configuration');
}

