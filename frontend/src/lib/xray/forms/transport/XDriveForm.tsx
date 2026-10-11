import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { Alert, Button, Collapse, Form, Input, InputNumber, Select, theme } from 'antd';
import { FormField } from '@/components/form/rhf';
import { JsonEditor } from '@/components/form';
import { yandexDiskXDriveSettings } from '@/lib/xray/xdrive';

const PATH = 'streamSettings.xdriveSettings';
const TUNING = [
  ['segmentBytes', 524288],
  ['flushIntervalMs', 20],
  ['pollIntervalMs', 50],
  ['maxPollIntervalMs', 500],
  ['sessionTtlSeconds', 300],
  ['concurrency', 8],
  ['eagerWindowMs', 2000],
  ['holeTimeoutMs', 30000],
] as const;

export default function XDriveForm() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { control, setValue, getValues } = useFormContext();
  const service = useWatch({ control, name: `${PATH}.service` });
  return (
    <>
      <Form.Item wrapperCol={{ span: 24, offset: 0 }}>
        <Alert type="info" showIcon title={t('pages.inbounds.form.xdriveHint')} />
      </Form.Item>
      <FormField name={`${PATH}.service`} label={t('pages.inbounds.form.xdriveService')}>
        <Select
          options={[
            { value: 'Google Drive', label: 'Google Drive' },
            { value: 'template', label: t('pages.inbounds.form.xdriveTemplate') },
            { value: 'local', label: t('pages.inbounds.form.xdriveLocal') },
          ]}
        />
      </FormField>
      <FormField
        name={`${PATH}.remoteFolder`}
        label={t('pages.inbounds.form.xdriveFolder')}
        required
      >
        <Input />
      </FormField>
      {service === 'Google Drive' &&
        ['Client ID', 'Client Secret', 'Refresh Token'].map((label, index) => (
          <FormField key={label} name={`${PATH}.secrets.${index}`} label={label} required>
            <Input.Password autoComplete="off" />
          </FormField>
        ))}
      {service === 'template' && (
        <>
          <Form.Item>
            <Button
              onClick={() => {
                const preset = yandexDiskXDriveSettings();
                preset.remoteFolder = getValues(`${PATH}.remoteFolder`) ?? '';
                setValue(PATH, preset, { shouldDirty: true });
              }}
            >
              {t('pages.inbounds.form.xdriveYandexPreset')}
            </Button>
          </Form.Item>
          <FormField
            name={`${PATH}.secrets`}
            label={t('pages.inbounds.form.xdriveSecrets')}
            extra={t('pages.inbounds.form.xdriveSecretsHint')}
            transform={{
              input: (value: unknown) => (Array.isArray(value) ? value.join('\n') : ''),
              output: (value: unknown) => String(value).split('\n'),
            }}
          >
            <Input.TextArea autoComplete="off" autoSize={{ minRows: 2, maxRows: 6 }} />
          </FormField>
          <FormField
            name={`${PATH}.template`}
            label={t('pages.inbounds.form.xdriveTemplate')}
            required
            transform={{
              input: (value: unknown) =>
                typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2),
              output: (value: unknown) => {
                try {
                  return JSON.parse(String(value));
                } catch {
                  return value;
                }
              },
            }}
          >
            <JsonEditor value="" minHeight="240px" maxHeight="480px" />
          </FormField>
        </>
      )}
      <Collapse
        style={{ marginBottom: token.marginLG }}
        items={[
          {
            key: 'tuning',
            label: t('pages.inbounds.form.xdriveTuning'),
            children: (
              <>
                {TUNING.map(([name, fallback], index) => (
                  <FormField
                    key={name}
                    name={`${PATH}.${name}`}
                    label={name}
                    style={index === TUNING.length - 1 ? { marginBottom: 0 } : undefined}
                  >
                    <InputNumber
                      min={0}
                      max={4294967295}
                      precision={0}
                      placeholder={String(fallback)}
                      style={{ width: '100%' }}
                    />
                  </FormField>
                ))}
              </>
            ),
          },
        ]}
      />
    </>
  );
}
