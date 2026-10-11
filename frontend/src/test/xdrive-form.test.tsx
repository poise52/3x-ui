import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Form } from 'antd';
import { ThemeProvider } from '@/hooks/useTheme';
import { useZodForm } from '@/components/form/rhf';
import { InboundStreamFormSchema } from '@/schemas/forms/inbound-form';
import XDriveForm from '@/lib/xray/forms/transport/XDriveForm';
import XDriveTlsForm from '@/lib/xray/forms/transport/XDriveTlsForm';

const Schema = z.object({ streamSettings: InboundStreamFormSchema });
function TestForm({ save, tls = false }: { save: (value: unknown) => void; tls?: boolean }) {
  const methods = useZodForm(Schema, {
    defaultValues: {
      streamSettings: {
        network: 'xdrive',
        security: tls ? 'tls' : 'none',
        ...(tls ? { tlsSettings: {} } : {}),
        xdriveSettings: {
          service: tls ? 'local' : 'template',
          remoteFolder: 'shared',
          secrets: [],
        },
      },
    },
  });
  return (
    <ThemeProvider>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(save)}>
          <Form component={false}>{tls ? <XDriveTlsForm /> : <XDriveForm />}</Form>
          <button type="submit">Save XDRIVE</button>
        </form>
      </FormProvider>
    </ThemeProvider>
  );
}

describe('XDRIVE form', () => {
  it('saves a trusted CA without private keys and removes it through the editor', async () => {
    const save = vi.fn();
    render(<TestForm save={save} tls />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
    fireEvent.click(await screen.findByText('File Content'));
    fireEvent.change(await screen.findByLabelText('Public Key'), {
      target: { value: '-----BEGIN CERTIFICATE-----\ntest-ca\n-----END CERTIFICATE-----' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Disable System Root' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Session Resumption' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save XDRIVE' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({
      streamSettings: {
        tlsSettings: {
          disableSystemRoot: true,
          enableSessionResumption: true,
          certificates: [
            {
              usage: 'verify',
              certificate: ['-----BEGIN CERTIFICATE-----', 'test-ca', '-----END CERTIFICATE-----'],
            },
          ],
        },
      },
    });
    const settings = save.mock.calls[0][0].streamSettings.tlsSettings;
    expect(settings.certificates[0]).not.toHaveProperty('key');
    expect(settings.certificates[0]).not.toHaveProperty('useFile');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save XDRIVE' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].streamSettings.tlsSettings.certificates).toEqual([]);
  });
  it('loads the Yandex preset and saves both credentials without replacing the shared folder', async () => {
    const save = vi.fn();
    render(<TestForm save={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use Yandex Disk WebDAV template' }));
    fireEvent.change(screen.getByLabelText('Secrets'), {
      target: { value: 'login\napp-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save XDRIVE' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({
      streamSettings: {
        network: 'xdrive',
        xdriveSettings: {
          service: 'template',
          remoteFolder: 'shared',
          secrets: ['login', 'app-password'],
          template: {
            auth: { type: 'basic' },
            list: { method: 'PROPFIND', headers: { Depth: '1' } },
          },
        },
      },
    });
  });
});
