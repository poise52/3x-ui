import { useTranslation } from 'react-i18next';
import { Button, Form, Input, Radio, Select, Space, Switch } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '@/components/form/rhf';
import { CipherSuitesSelect } from '@/components/form';
import { TlsVersionSchema, UtlsFingerprintSchema } from '@/schemas/protocols/security/tls';

import { XDriveAlpnSchema } from '@/schemas/protocols/stream/xdrive';

const PATH = 'streamSettings.tlsSettings';

function TrustedCa({ index, remove }: { index: number; remove: () => void }) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const path = `${PATH}.certificates.${index}`;
  const useFile = useWatch({ control, name: `${path}.useFile` });
  const certificateFile = useWatch({ control, name: `${path}.certificateFile` });
  const fileMode = useFile ?? certificateFile != null;
  return (
    <>
      <FormField
        name={`${path}.useFile`}
        label={`${t('certificate')} ${index + 1}`}
        transform={{ input: () => fileMode }}
      >
        <Radio.Group buttonStyle="solid">
          <Radio.Button value={true}>{t('pages.inbounds.certificatePath')}</Radio.Button>
          <Radio.Button value={false}>{t('pages.inbounds.certificateContent')}</Radio.Button>
        </Radio.Group>
      </FormField>
      {fileMode ? (
        <FormField
          name={`${path}.certificateFile`}
          label={t('pages.inbounds.publicKey')}
          tooltip={t('pages.inbounds.form.xdriveTrustedCaTip')}
          required
        >
          <Input />
        </FormField>
      ) : (
        <FormField
          name={`${path}.certificate`}
          label={t('pages.inbounds.publicKey')}
          tooltip={t('pages.inbounds.form.xdriveTrustedCaTip')}
          required
          transform={{
            input: (value: unknown) => (Array.isArray(value) ? value.join('\n') : ''),
            output: (value: unknown) => String(value).split(/\r?\n/),
          }}
        >
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
        </FormField>
      )}
      <FormField
        name={`${path}.oneTimeLoading`}
        label={t('pages.inbounds.form.oneTimeLoading')}
        valueProp="checked"
      >
        <Switch />
      </FormField>
      <Form.Item label=" ">
        <Button aria-label={t('remove')} danger size="small" onClick={remove}>
          <MinusOutlined /> {t('remove')}
        </Button>
      </Form.Item>
    </>
  );
}

export default function XDriveTlsForm() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: `${PATH}.certificates` });
  return (
    <>
      <FormField name={`${PATH}.serverName`} label="SNI">
        <Input placeholder={t('pages.inbounds.form.serverNameIndication')} />
      </FormField>
      <FormField name={`${PATH}.cipherSuites`} label={t('pages.inbounds.form.cipherSuites')}>
        <CipherSuitesSelect placeholder={t('pages.inbounds.form.autoOption')} />
      </FormField>
      <Form.Item label={t('pages.inbounds.form.minMaxVersion')}>
        <Space.Compact block>
          <FormField name={`${PATH}.minVersion`} noStyle>
            <Select
              style={{ width: '50%' }}
              options={TlsVersionSchema.options.map((value) => ({ value, label: value }))}
            />
          </FormField>
          <FormField name={`${PATH}.maxVersion`} noStyle>
            <Select
              style={{ width: '50%' }}
              options={TlsVersionSchema.options.map((value) => ({ value, label: value }))}
            />
          </FormField>
        </Space.Compact>
      </Form.Item>
      <FormField name={`${PATH}.fingerprint`} label="uTLS">
        <Select
          options={[
            { value: '', label: t('none') },
            ...UtlsFingerprintSchema.options.map((value) => ({ value, label: value })),
          ]}
        />
      </FormField>
      <FormField name={`${PATH}.alpn`} label="ALPN">
        <Select
          mode="multiple"
          options={XDriveAlpnSchema.options.map((value) => ({ value, label: value }))}
        />
      </FormField>
      <FormField
        name={`${PATH}.curvePreferences`}
        label={t('pages.inbounds.form.curvePreferences')}
        tooltip={t('pages.inbounds.form.curvePreferencesTip')}
      >
        <Select
          mode="tags"
          tokenSeparators={[',', ' ']}
          options={['X25519MLKEM768', 'X25519', 'P-256', 'P-384', 'P-521'].map((value) => ({
            value,
            label: value,
          }))}
        />
      </FormField>
      <FormField
        name={`${PATH}.disableSystemRoot`}
        label={t('pages.inbounds.form.disableSystemRoot')}
        valueProp="checked"
      >
        <Switch />
      </FormField>
      <FormField
        name={`${PATH}.enableSessionResumption`}
        label={t('pages.inbounds.form.sessionResumption')}
        valueProp="checked"
      >
        <Switch />
      </FormField>
      <Form.Item label={t('pages.inbounds.form.xdriveTrustedCa')}>
        <Button
          aria-label={t('add')}
          type="primary"
          size="small"
          onClick={() =>
            append({
              usage: 'verify',
              useFile: true,
              certificateFile: '',
              certificate: [],
              oneTimeLoading: false,
            })
          }
        >
          <PlusOutlined />
        </Button>
      </Form.Item>
      {fields.map((field, index) => (
        <TrustedCa key={field.id} index={index} remove={() => remove(index)} />
      ))}
      <FormField
        name={`${PATH}.masterKeyLog`}
        label={t('pages.inbounds.form.masterKeyLog')}
        tooltip={t('pages.inbounds.form.masterKeyLogTip')}
      >
        <Input placeholder="/path/to/sslkeylog.txt" />
      </FormField>
      <FormField name={`${PATH}.echConfigList`} label="ECH">
        <Input />
      </FormField>
      <FormField
        name={`${PATH}.pinnedPeerCertSha256`}
        label={t('pages.inbounds.form.pinnedPeerCertSha256')}
      >
        <Select mode="tags" tokenSeparators={[',']} />
      </FormField>
      <FormField
        name={`${PATH}.verifyPeerCertByName`}
        label={t('pages.inbounds.form.verifyPeerCertByName')}
      >
        <Input />
      </FormField>
    </>
  );
}
