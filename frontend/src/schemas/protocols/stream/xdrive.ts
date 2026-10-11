import { z } from 'zod';

const UInt32 = z.number().int().min(0).max(4294967295);
const Operation = z.object({
  method: z.string().optional(),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  namesRegex: z.string().optional(),
});
export const XDriveTemplateSchema = z.object({
  flatten: z.boolean().optional(),
  concurrency: z.number().int().min(1).max(256).optional(),
  auth: z
    .object({
      type: z.enum(['none', 'static', 'basic', 'oauth2']).optional(),
      header: z.record(z.string(), z.string()).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      tokenUrl: z.string().optional(),
      form: z.record(z.string(), z.string()).optional(),
      tokenPath: z.string().optional(),
      expiryPath: z.string().optional(),
    })
    .optional(),
  put: Operation,
  get: Operation,
  delete: Operation,
  list: Operation.extend({ namesRegex: z.string().min(1) }),
  retry: z
    .object({ status: z.array(z.number().int()).optional(), rateReason: z.string().optional() })
    .optional(),
});

export const XDriveStreamSettingsSchema = z
  .object({
    remoteFolder: z.string().default(''),
    service: z.enum(['local', 'Google Drive', 'template']).default('Google Drive'),
    secrets: z.array(z.string()).default([]),
    segmentBytes: UInt32.optional(),
    flushIntervalMs: UInt32.optional(),
    pollIntervalMs: UInt32.optional(),
    maxPollIntervalMs: UInt32.optional(),
    sessionTtlSeconds: UInt32.optional(),
    concurrency: UInt32.optional(),
    eagerWindowMs: UInt32.optional(),
    holeTimeoutMs: UInt32.optional(),
    template: XDriveTemplateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.remoteFolder.trim())
      ctx.addIssue({
        code: 'custom',
        path: ['remoteFolder'],
        message: 'pages.inbounds.form.xdriveFolderRequired',
      });
    if (
      value.service === 'Google Drive' &&
      (value.secrets.length !== 3 || value.secrets.some((secret) => !secret.trim()))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['secrets'],
        message: 'pages.inbounds.form.xdriveGoogleSecretsRequired',
      });
    }
    if (value.service === 'template' && !value.template)
      ctx.addIssue({
        code: 'custom',
        path: ['template'],
        message: 'pages.inbounds.form.xdriveTemplateRequired',
      });
  });
export type XDriveStreamSettings = z.infer<typeof XDriveStreamSettingsSchema>;
