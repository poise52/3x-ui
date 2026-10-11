import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Form } from 'antd';
import { ThemeProvider } from '@/hooks/useTheme';
import { useZodForm } from '@/components/form/rhf';
import { InboundStreamFormSchema } from '@/schemas/forms/inbound-form';
import XDriveForm from '@/lib/xray/forms/transport/XDriveForm';

const Schema = z.object({ streamSettings: InboundStreamFormSchema });
function TestForm({ save }: { save: (value: unknown) => void }) {
  const methods = useZodForm(Schema, {
    defaultValues: {
      streamSettings: {
        network: 'xdrive',
        security: 'none',
        xdriveSettings: {
          service: 'template',
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
          <Form component={false}>
            <XDriveForm />
          </Form>
          <button type="submit">Save XDRIVE</button>
        </form>
      </FormProvider>
    </ThemeProvider>
  );
}

describe('XDRIVE form', () => {
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
