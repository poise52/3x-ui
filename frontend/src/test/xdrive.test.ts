import { InboundFormSchema } from '@/schemas/forms/inbound-form';
import { OutboundFormSchema } from '@/schemas/forms/outbound-form';
import { normalizeXdnsFinalMask } from '@/lib/xray/xdns-mask';
import { describe, expect, it } from 'vitest';
import {
  rawInboundToFormValues,
  formValuesToWirePayload as inboundToWire,
} from '@/lib/xray/inbound-form-adapter';
import {
  rawOutboundToFormValues,
  formValuesToWirePayload as outboundToWire,
} from '@/lib/xray/outbound-form-adapter';
import { XDriveStreamSettingsSchema } from '@/schemas/protocols/stream';

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
