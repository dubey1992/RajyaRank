'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, Button, Field } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

type Step = 'start' | 'scan' | 'done';

/** Self-service TOTP enrollment: POST /auth/mfa/enroll returns a secret +
 *  otpauth:// URL, rendered here as a real scannable QR code (previously
 *  the only way to enroll was via a raw API call and reading the secret
 *  string out of the response — unusable for an actual end user). The
 *  manual key stays visible as a fallback for phones that can't scan, or
 *  password managers where copy-paste is easier than a camera. */
export function MfaSetup({ locale }: { locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [step, setStep] = useState<Step>('start');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function startEnrollment() {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ secret: string; otpauthUrl: string }>('/auth/mfa/enroll', { method: 'POST' });
      setSecret(res.secret);
      setOtpauthUrl(res.otpauthUrl);
      setStep('scan');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ confirmed: boolean }>('/auth/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) });
      if (!res.confirmed) {
        setError(L('कोड सही नहीं है। ऐप में दिख रहा नया 6-अंकों का कोड डालें।', 'That code is incorrect. Enter the current 6-digit code shown in your app.'));
        return;
      }
      setStep('done');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <Alert tone="success">
        {L(
          'दो-चरणीय सत्यापन सक्षम कर दिया गया है। अगली बार साइन इन करते समय आपसे अपने ऐप का कोड माँगा जाएगा।',
          "Two-factor authentication is now enabled. You'll be asked for a code from your app the next time you sign in.",
        )}
      </Alert>
    );
  }

  if (step === 'scan') {
    return (
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="rounded-md border border-line bg-white p-3">
          <QRCodeSVG value={otpauthUrl} size={160} />
        </div>
        <div>
          <p className="mb-2 text-sm text-ink">
            {L(
              '1. अपने फ़ोन में Google Authenticator, Authy, या अपने पासवर्ड ऐप के "स्कैन QR कोड" विकल्प से इस कोड को स्कैन करें।',
              '1. Scan this code with Google Authenticator, Authy, your password manager, or the iPhone Passwords app\'s "Set Up Verification Code".',
            )}
          </p>
          <p className="mb-1 text-xs font-extrabold uppercase text-muted">
            {L('स्कैन नहीं कर सकते? की मैन्युअल रूप से डालें:', "Can't scan? Enter this key manually:")}
          </p>
          <code className="mb-3 block w-fit rounded bg-surface-soft px-2 py-1.5 text-sm font-black tracking-widest text-navy-900">{secret}</code>
          <p className="mb-2 text-sm text-ink">
            {L('2. ऐप में दिखने वाला 6-अंकों का कोड यहाँ डालें:', '2. Enter the 6-digit code your app is now showing:')}
          </p>
          {error ? <div className="mb-2"><Alert tone="error">{error}</Alert></div> : null}
          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); void confirmCode(); }}
            className="flex flex-wrap items-end gap-2"
          >
            <Field
              label={L('कोड', 'Code')}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="submit" loading={busy} disabled={code.length !== 6}>
              {L('पुष्टि करें', 'Confirm')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {L(
          'हर साइन इन पर पासवर्ड के अलावा एक बार का कोड माँगकर अपने अकाउंट को अतिरिक्त सुरक्षा दें।',
          'Add an extra layer of security by requiring a one-time code, in addition to your password, every time you sign in.',
        )}
      </p>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      <Button type="button" loading={busy} onClick={() => void startEnrollment()}>
        {L('दो-चरणीय सत्यापन सेट करें', 'Set up two-factor authentication')}
      </Button>
    </div>
  );
}
