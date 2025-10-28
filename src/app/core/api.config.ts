// src/app/core/api.config.ts
const PROD_API_URL = 'https://love-api-prod.uc.r.appspot.com/api';
const DEV_API_URL = 'http://localhost:4001/api';

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.local')
  );
}

export function resolveApiUrl(): string {
  const env = (
    import.meta as ImportMeta & { env?: ImportMetaEnv & Record<string, string | undefined> }
  ).env;
  const envMap = env as Record<string, string | undefined> | undefined;

  const raw = envMap?.['NG_APP_API_URL'] ?? envMap?.['ng_app_api_url'];
  const normalized = raw?.trim();

  if (normalized && normalized.length > 0) {
    return normalized.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname && isLocalHostname(hostname)) {
      return DEV_API_URL;
    }
  }

  const nodeEnv = envMap?.['NODE_ENV'] ?? envMap?.['MODE'];
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return DEV_API_URL;
  }

  return PROD_API_URL;
}

export function buildApiUrl(path: string): string {
  const base = resolveApiUrl();
  if (!path) {
    return `${base}/`;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
