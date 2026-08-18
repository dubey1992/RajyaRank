'use client';
import { useState, type ReactNode } from 'react';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';

/**
 * Ask-a-doubt, in place — opens over the lesson the student is already
 * reading instead of navigating to /doubts, so they never lose their spot.
 * Submits with this lesson's id attached (the API already supported
 * lessonId on CreateDoubt; the /doubts page composer just never sent it).
 */
export function AskDoubtModal({
  lessonId,
  locale,
  triggerClassName,
  children,
}: {
  lessonId: string;
  locale: string;
  triggerClassName: string;
  children: ReactNode;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function close() {
    setOpen(false);
    setBody('');
    setErrors({});
    setSubmitted(false);
  }

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
      await apiFetch('/student/doubts', { method: 'POST', body: JSON.stringify({ bodyText: body, lessonId }) });
      setSubmitted(true);
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true" onClick={close}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-navy-900">{L('सवाल पूछें', 'Ask a doubt')}</h2>
              <button type="button" onClick={close} aria-label={hi ? 'बंद करें' : 'Close'} className="text-muted hover:text-ink">✕</button>
            </div>
            {submitted ? (
              <div className="py-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal-100 text-2xl text-teal-600">✓</div>
                <p className="mt-3 text-sm font-extrabold text-navy-900">{L('आपका सवाल भेज दिया गया है।', 'Your doubt has been submitted.')}</p>
                <p className="mt-1 text-xs text-muted">{L('हमारे शिक्षक जल्द जवाब देंगे।', 'Our educators will respond soon.')}</p>
                <Button type="button" onClick={close} className="mt-4 w-full">{L('ठीक है', 'Done')}</Button>
              </div>
            ) : (
              <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
                <textarea
                  autoFocus
                  aria-invalid={errors.bodyText ? true : undefined}
                  aria-describedby={errors.bodyText ? 'doubt-modal-error' : undefined}
                  className="h-24 w-full rounded-md border border-line p-3 outline-none focus:border-orange-500"
                  placeholder={hi ? 'अपना प्रश्न विस्तार से लिखें…' : 'Describe your doubt…'}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                {errors.bodyText ? <p id="doubt-modal-error" role="alert" className="mt-1 text-sm text-danger">{errors.bodyText}</p> : null}
                <Button type="submit" loading={busy} className="mt-3 w-full">{hi ? 'प्रश्न भेजें' : 'Submit doubt'}</Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
