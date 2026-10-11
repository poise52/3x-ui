import type { XDriveStreamSettings } from '@/schemas/protocols/stream/xdrive';

export function yandexDiskXDriveSettings(): XDriveStreamSettings {
  const base = 'https://webdav.yandex.ru/{folder}';
  return {
    service: 'template',
    remoteFolder: '',
    secrets: ['', ''],
    segmentBytes: 262144,
    flushIntervalMs: 100,
    pollIntervalMs: 300,
    maxPollIntervalMs: 1500,
    sessionTtlSeconds: 120,
    concurrency: 8,
    template: {
      flatten: true,
      auth: { type: 'basic', username: '{secret0}', password: '{secret1}' },
      put: { method: 'PUT', url: `${base}/{name}` },
      get: { method: 'GET', url: `${base}/{name}` },
      delete: { method: 'DELETE', url: `${base}/{name}` },
      list: {
        method: 'PROPFIND',
        url: `${base}/`,
        headers: { Depth: '1' },
        namesRegex: '<d:href>[^<]*/([^/<]+)</d:href>',
      },
      retry: { status: [429, 500, 502, 503] },
    },
  };
}
export function xdriveClientTlsSettings(tls: Record<string, unknown>): Record<string, unknown> {
  const settings = tls.settings;
  const out = { ...(settings && typeof settings === 'object' ? settings : {}), ...tls } as Record<
    string,
    unknown
  >;
  delete out.settings;
  if (Array.isArray(tls.certificates)) {
    out.certificates = tls.certificates.filter(
      (cert: unknown) =>
        cert != null && typeof cert === 'object' && 'usage' in cert && cert.usage === 'verify',
    );
  }
  return out;
}
