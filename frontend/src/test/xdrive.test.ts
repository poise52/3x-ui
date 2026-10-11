import { InboundFormSchema } from '@/schemas/forms/inbound-form';
import { OutboundFormSchema } from '@/schemas/forms/outbound-form';
import { normalizeXdnsFinalMask } from '@/lib/xray/xdns-mask';
import { xdriveClientTlsSettings } from '@/lib/xray/xdrive';
import { describe, expect, it } from 'vitest';
import {
  rawInboundToFormValues,
  formValuesToWirePayload as inboundToWire,
} from '@/lib/xray/inbound-form-adapter';
import {
  rawOutboundToFormValues,
  formValuesToWirePayload as outboundToWire,
} from '@/lib/xray/outbound-form-adapter';
import { XDriveStreamSettingsSchema, XDriveTlsSettingsSchema } from '@/schemas/protocols/stream';

const xdriveSettings = {
  service: 'template',
  remoteFolder: 'tunnel',
  secrets: ['user', 'password'],
  template: {
    auth: { type: 'basic', username: '{secret0}', password: '{secret1}' },
    put: { method: 'PUT', url: 'https://webdav.yandex.ru/{folder}/{name}' },
    get: { method: 'GET', url: 'https://webdav.yandex.ru/{folder}/{name}' },
    delete: { method: 'DELETE', url: 'https://webdav.yandex.ru/{folder}/{name}' },
    list: {
      method: 'PROPFIND',
      url: 'https://webdav.yandex.ru/{folder}/',
      headers: { Depth: '1' },
      namesRegex: '<d:href>[^<]*/([^/<]+)</d:href>',
    },
    flatten: true,
  },
  segmentBytes: 262144,
  flushIntervalMs: 100,
  pollIntervalMs: 300,
  maxPollIntervalMs: 1500,
  sessionTtlSeconds: 120,
  concurrency: 8,
  eagerWindowMs: 2000,
  holeTimeoutMs: 30000,
};
const streamSettings = { network: 'xdrive', security: 'none', xdriveSettings };

describe('XDRIVE configuration', () => {
  it('keeps trusted CAs and client options when switching from server TLS to XDRIVE', () => {
    const result = XDriveTlsSettingsSchema.parse(
      xdriveClientTlsSettings({
        serverName: 'storage.example.com',
        settings: { fingerprint: 'chrome' },
        certificates: [
          { usage: 'encipherment', certificateFile: '/server.pem', keyFile: '/server.key' },
          { usage: 'verify', certificateFile: '/storage-ca.pem' },
        ],
      }),
    );
    expect(result).toMatchObject({
      serverName: 'storage.example.com',
      fingerprint: 'chrome',
      certificates: [{ usage: 'verify', certificateFile: '/storage-ca.pem' }],
    });
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0]).not.toHaveProperty('keyFile');
  });
  it('rejects HTTP/3 ALPN unsupported by the XDRIVE service client', () => {
    const result = XDriveTlsSettingsSchema.safeParse({ alpn: ['h3'] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['alpn', 0]);
  });
  it('rejects empty trusted CA entries and reversed TLS version bounds', () => {
    const emptyCa = XDriveTlsSettingsSchema.safeParse({
      certificates: [{ usage: 'verify', useFile: false, certificate: [] }],
    });
    expect(emptyCa.success).toBe(false);
    if (!emptyCa.success)
      expect(emptyCa.error.issues.map((issue) => issue.path)).toContainEqual([
        'certificates',
        0,
        'certificate',
      ]);
    const versions = XDriveTlsSettingsSchema.safeParse({ minVersion: '1.3', maxVersion: '1.2' });
    expect(versions.success).toBe(false);
    if (!versions.success)
      expect(versions.error.issues.map((issue) => issue.path)).toContainEqual(['maxVersion']);
  });
  it('preserves client TLS options without requiring an inbound server certificate', () => {
    const tlsStream = {
      ...streamSettings,
      security: 'tls',
      tlsSettings: {
        serverName: 'webdav.yandex.ru',
        fingerprint: 'chrome',
        alpn: ['h2'],
        echConfigList: 'test-ech',
        verifyPeerCertByName: 'webdav.yandex.ru',
        pinnedPeerCertSha256: ['test-pin'],
        minVersion: '1.2',
        maxVersion: '1.3',
        cipherSuites: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        curvePreferences: ['X25519', 'P-256'],
        disableSystemRoot: true,
        enableSessionResumption: true,
        masterKeyLog: '/tmp/xdrive-tls.keys',
        certificates: [
          {
            usage: 'verify',
            certificate: ['-----BEGIN CERTIFICATE-----', 'test-ca', '-----END CERTIFICATE-----'],
          },
          { usage: 'verify', certificateFile: '/etc/x-ui/storage-ca.pem' },
        ],
      },
    };
    const inbound = rawInboundToFormValues({
      protocol: 'vless',
      port: 8443,
      settings: JSON.stringify({ clients: [], decryption: 'none' }),
      streamSettings: JSON.stringify(tlsStream),
    });
    const inboundWire = JSON.parse(inboundToWire(InboundFormSchema.parse(inbound)).streamSettings);
    expect(inboundWire).toMatchObject(tlsStream);
    expect(inboundWire.tlsSettings.certificates[0]).not.toHaveProperty('key');
    expect(inboundWire.tlsSettings.certificates[1]).not.toHaveProperty('keyFile');
    const outbound = rawOutboundToFormValues({
      protocol: 'vless',
      tag: 'drive',
      settings: { address: 'example.com', port: 443, id: '11111111-2222-4333-8444-555555555555' },
      streamSettings: tlsStream,
    });
    expect(outboundToWire(OutboundFormSchema.parse(outbound)).streamSettings).toMatchObject(
      tlsStream,
    );
  });
  it('preserves HTTP templates and secrets through inbound editing and saving', () => {
    const form = rawInboundToFormValues({
      protocol: 'vless',
      port: 8443,
      settings: JSON.stringify({ clients: [], decryption: 'none' }),
      streamSettings: JSON.stringify(streamSettings),
    });
    expect(JSON.parse(inboundToWire(InboundFormSchema.parse(form)).streamSettings)).toMatchObject(
      streamSettings,
    );
  });
  it('preserves HTTP templates and tuning through outbound editing and saving', () => {
    const form = rawOutboundToFormValues({
      protocol: 'vless',
      tag: 'drive',
      settings: {
        address: 'example.com',
        port: 443,
        id: '11111111-2222-4333-8444-555555555555',
        encryption: 'none',
      },
      streamSettings,
    });
    expect(outboundToWire(OutboundFormSchema.parse(form)).streamSettings).toMatchObject(
      streamSettings,
    );
  });
  it('rejects incomplete Google Drive credentials and a missing template', () => {
    const google = XDriveStreamSettingsSchema.safeParse({
      service: 'Google Drive',
      remoteFolder: 'folder',
      secrets: ['id', 'secret'],
    });
    expect(google.success).toBe(false);
    if (!google.success)
      expect(google.error.issues.map((issue) => issue.path)).toContainEqual(['secrets']);
    const template = XDriveStreamSettingsSchema.safeParse({
      service: 'template',
      remoteFolder: 'folder',
    });
    expect(template.success).toBe(false);
    if (!template.success)
      expect(template.error.issues.map((issue) => issue.path)).toContainEqual(['template']);
  });
  it('drops stored Vision flow when a VLESS outbound uses XDRIVE', () => {
    const form = rawOutboundToFormValues({
      protocol: 'vless',
      tag: 'drive',
      settings: {
        address: 'example.com',
        port: 443,
        id: '11111111-2222-4333-8444-555555555555',
        encryption: 'none',
        flow: 'xtls-rprx-vision',
        testseed: [1, 2, 3, 4],
      },
      streamSettings,
    });
    const wire = outboundToWire(OutboundFormSchema.parse(form));
    expect(wire.settings).toMatchObject({ flow: '' });
    expect(wire.settings).not.toHaveProperty('testseed');
  });
});

it('keeps old XDNS domains and TCP resolver addresses in the new wire shape', () => {
  const original = {
    udp: [
      {
        type: 'xdns',
        settings: {
          domains: [{ name: 't.example.com', types: [16], edns0: 1232 }],
          resolvers: [{ type: 'tcp', settings: { addr: '8.8.8.8:53' } }],
        },
      },
    ],
  };
  expect(normalizeXdnsFinalMask(original)).toEqual({
    udp: [
      {
        type: 'xdns',
        settings: {
          domains: [{ names: ['t.example.com'], types: [16], edns0: 1232 }],
          resolvers: [{ addrs: ['tcp://8.8.8.8:53'] }],
        },
      },
    ],
  });
  expect(original.udp[0].settings.domains[0].name).toBe('t.example.com');
});
