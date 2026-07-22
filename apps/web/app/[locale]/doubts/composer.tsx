'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';

export function DoubtComposer({ locale }: { locale: string }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Localised, case-complete validation (empty vs. too short).
  function bodyError(): string | undefined {
    if (!body.trim()) return L('कृपया अपना प्रश्न दर्ज करें।', 'Please enter your doubt.');
    if (body.trim().length < 10) return L('प्रश्न कम से कम 10 अक्षर का होना चाहिए।', 'Your doubt must be at least 10 characters.');
    return undefined;
  }

  async function submit() {
    const err = bodyError();
    if (err) return setErrors({ bodyText: err });
    setErrors({});
    setBusy(true);
    try {
      await apiFetch('/student/doubts', { method: 'POST', body: JSON.stringify({ bodyText: body }) });
      setBody('');
      router.refresh();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="rounded-lg border border-line bg-white p-4">
      {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
      <textarea
        aria-invalid={errors.bodyText ? true : undefined}
        aria-describedby={errors.bodyText ? 'doubt-error' : undefined}
        className="h-24 w-full rounded-md border border-line p-3 outline-none focus:border-orange-500"
        placeholder={hi ? 'अपना प्रश्न विस्तार से लिखें…' : 'Describe your doubt…'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {errors.bodyText ? <p id="doubt-error" role="alert" className="mt-1 text-sm text-danger">{errors.bodyText}</p> : null}
      <Button type="submit" loading={busy} className="mt-3 w-full">
        {hi ? 'प्रश्न भेजें' : 'Submit doubt'}
      </Button>
    </form>
  );
}
