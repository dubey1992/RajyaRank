'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { type Locale } from '@/lib/i18n';
import { makeT } from '@/lib/t';
import { acceptInvitationSchema } from '@rajyarank/contracts';
import { serverFieldErrors, validate } from '@/lib/form';

export function AcceptForm({ token, locale }: { token: string; locale: Locale }) {
  const t = makeT(locale);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit() {
    const errs = validate(acceptInvitationSchema, { token, password });
    setErrors(errs);
    if (errs.password) return;
    setBusy(true);
    try {
      await apiFetch(`/staff/invitations/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setDone(true);
      setTimeout(() => router.push(`/${locale}/admin/login`), 1200);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Alert tone="success">{locale === 'hi' ? 'खाता सक्रिय!' : 'Account activated!'}</Alert>;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {errors._form ? (
        <div className="mb-4">
          <Alert tone="error">{errors._form}</Alert>
        </div>
      ) : null}
      <Field
        label={t('invitation.createPassword')}
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" variant="secondary" loading={busy} className="w-full">
        {t('invitation.accept')}
      </Button>
    </form>
  );
}
