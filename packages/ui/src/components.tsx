import * as React from 'react';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
};

export function Button({ variant = 'primary', loading, className, children, ...rest }: ButtonProps) {
  const base =
    'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md px-4 font-extrabold transition focus-visible:outline focus-visible:outline-2';
  const variants: Record<string, string> = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60',
    secondary: 'bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-60',
    outline: 'border border-line bg-white text-navy-900 hover:bg-surface-soft',
  };
  return (
    <button
      className={cx(base, variants[variant], className)}
      aria-busy={loading || undefined}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {off ? (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19m-3.35 2.5A9.13 9.13 0 0 1 12 20c-7 0-10-8-10-8a17.6 17.6 0 0 1 4.22-5.94" />
          <path d="M9.53 9.53a3 3 0 0 0 4.24 4.24" />
          <path d="M2 2l20 20" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function Field({ label, error, id, type, ...rest }: FieldProps) {
  const inputId = id ?? rest.name ?? label;
  const errId = error ? `${inputId}-error` : undefined;
  const isPassword = type === 'password';
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="mb-1 block text-sm font-extrabold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className={cx('w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-orange-500', isPassword && 'pr-11')}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
          >
            <EyeIcon off={visible} />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    info: 'bg-navy-100 text-navy-900',
    error: 'bg-orange-100 text-danger',
    success: 'bg-teal-100 text-success',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-md px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  );
}

/** RajyaRank brand mark (inline SVG) — open book + rising orange arrow. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="RajyaRank"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="512" height="512" rx="136" fill="#0B2F4F" />
      <path d="M112 314V189C112 168.013 129.013 151 150 151H238V365C214.789 340.805 181.734 327 147 327H125C117.82 327 112 321.18 112 314Z" fill="#FFFFFF" />
      <path d="M400 314V189C400 168.013 382.987 151 362 151H274V365C297.211 340.805 330.266 327 365 327H387C394.18 327 400 321.18 400 314Z" fill="#E8F7F4" />
      <path d="M256 359V151" stroke="#B9D5E6" strokeWidth="16" strokeLinecap="round" />
      <path d="M201 273L257 217L298 258L371 185" stroke="#F97316" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M323 185H371V233" stroke="#F97316" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="144" cy="112" r="14" fill="#0EA58A" />
      <circle cx="400" cy="112" r="9" fill="#F97316" />
    </svg>
  );
}

/** Brand lockup: mark + wordmark (Rajya + orange Rank). */
export function Logo({ size = 40, showWord = true }: { size?: number; showWord?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {showWord ? (
        <span style={{ fontWeight: 900, letterSpacing: '-0.03em', fontSize: size * 0.5 }}>
          <span style={{ color: '#0b2f4f' }}>Rajya</span>
          <span style={{ color: '#f97316' }}>Rank</span>
        </span>
      ) : null}
    </span>
  );
}

/** Standard non-happy-path states every screen must handle. */
export function StateBlock({ kind, message }: { kind: 'loading' | 'empty' | 'error' | 'offline'; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line p-8 text-center text-muted">
      <span aria-hidden>{kind === 'loading' ? '⏳' : kind === 'offline' ? '📶' : kind === 'error' ? '⚠️' : '📭'}</span>
      <p>{message}</p>
    </div>
  );
}

/**
 * Accessible, in-app confirmation dialog — the replacement for window.confirm.
 * Controlled: the parent owns `open` and the confirm/cancel handlers.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-black text-navy-900">{title}</h2>
        {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy} className="min-h-[40px] px-4 text-sm">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'secondary' : 'primary'}
            onClick={onConfirm}
            loading={busy}
            className={cx('min-h-[40px] px-4 text-sm', tone === 'danger' && 'bg-danger hover:bg-danger/90')}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Lightweight auto-dismissing toast (bottom-right). Render when `message` is set. */
export function Toast({ message, tone = 'success', onDismiss }: { message: string | null; tone?: 'success' | 'error'; onDismiss?: () => void }) {
  React.useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDismiss?.(), 3500);
    return () => clearTimeout(id);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm" role="status" aria-live="polite">
      <div className={cx('rounded-md px-4 py-3 text-sm font-bold text-white shadow-lg', tone === 'error' ? 'bg-danger' : 'bg-success')}>
        {message}
      </div>
    </div>
  );
}
