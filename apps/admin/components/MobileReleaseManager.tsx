'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Toast, ConfirmDialog } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { MobileAppReleaseView, MobileReleaseUploadIntentResponse } from '@rajyarank/contracts';

const STATUS_STYLE: Record<MobileAppReleaseView['status'], { bg: string; fg: string }> = {
  UPLOADING: { bg: 'bg-line', fg: 'text-muted' },
  READY: { bg: 'bg-teal-100', fg: 'text-teal-600' },
  PUBLISHED: { bg: 'bg-success/15', fg: 'text-success' },
  ARCHIVED: { bg: 'bg-surface-soft', fg: 'text-muted' },
};

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MobileReleaseManager({ initial, locale }: { initial: MobileAppReleaseView[]; locale: 'hi' | 'en' }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();
  const [rows, setRows] = useState<MobileAppReleaseView[]>(initial);
  const [toast, setToast] = useState<string | null>(null);

  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotesHi, setReleaseNotesHi] = useState('');
  const [releaseNotesEn, setReleaseNotesEn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [confirmingPublishId, setConfirmingPublishId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusLabel = (s: MobileAppReleaseView['status']) => ({
    UPLOADING: L('अपलोड हो रहा है', 'Uploading'),
    READY: L('तैयार', 'Ready'),
    PUBLISHED: L('लाइव', 'Live'),
    ARCHIVED: L('संग्रहीत', 'Archived'),
  })[s];

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!/^\d+\.\d+\.\d+$/.test(versionName.trim())) errs.versionName = L('संस्करण फॉर्मेट में दर्ज करें, जैसे 1.5.0', 'Use version format like 1.5.0');
    if (!versionCode.trim() || !/^\d+$/.test(versionCode.trim())) errs.versionCode = L('एक पूर्णांक वर्शन कोड दर्ज करें।', 'Enter a whole-number version code.');
    if (!file) errs.file = L('APK फ़ाइल चुनें।', 'Choose an APK file.');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function upload() {
    if (!validate() || !file) return;
    setUploading(true);
    try {
      const intent = await apiFetch<MobileReleaseUploadIntentResponse>('/admin/mobile-releases/upload-intents', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'ANDROID',
          versionName: versionName.trim(),
          versionCode: Number(versionCode.trim()),
          releaseNotesHi: releaseNotesHi.trim() || undefined,
          releaseNotesEn: releaseNotesEn.trim() || undefined,
          fileName: file.name,
          mimeType: file.type || 'application/vnd.android.package-archive',
          sizeBytes: file.size,
        }),
      });
      const put = await fetch(intent.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/vnd.android.package-archive' },
        body: file,
      });
      if (!put.ok) throw new Error(L('स्टोरेज में अपलोड विफल रहा।', 'Upload to storage failed.'));
      const completed = await apiFetch<MobileAppReleaseView>(`/admin/mobile-releases/${intent.releaseId}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setRows((r) => [completed, ...r]);
      setVersionName(''); setVersionCode(''); setReleaseNotesHi(''); setReleaseNotesEn(''); setFile(null); setErrors({});
      setToast(L('अपलोड पूरा हुआ — अब इसे प्रकाशित करें।', 'Upload complete — you can publish it now.'));
      router.refresh();
    } catch (e) {
      setToast((e as ApiError).message ?? L('अपलोड विफल रहा।', 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  async function publish(id: string) {
    setBusyId(id);
    try {
      const updated = await apiFetch<MobileAppReleaseView>(`/admin/mobile-releases/${id}/publish`, { method: 'POST' });
      setRows((r) => r.map((row) => (row.id === id ? updated : row.status === 'PUBLISHED' ? { ...row, status: 'ARCHIVED' } : row)));
      setToast(L('प्रकाशित — यह अब वेबसाइट पर उपलब्ध संस्करण है।', 'Published — this is now the version students download.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setBusyId(null);
      setConfirmingPublishId(null);
    }
  }

  async function archive(id: string) {
    setBusyId(id);
    try {
      const updated = await apiFetch<MobileAppReleaseView>(`/admin/mobile-releases/${id}/archive`, { method: 'POST' });
      setRows((r) => r.map((row) => (row.id === id ? updated : row)));
      setToast(L('संग्रहीत किया गया।', 'Archived.'));
    } catch (e) {
      setToast((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  const publishingRow = rows.find((r) => r.id === confirmingPublishId) ?? null;

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('नया Android संस्करण अपलोड करें', 'Upload a new Android release')}</h2>
        <p className="mb-3 text-sm text-muted">{L('APK अपलोड करें, फिर नीचे सूची से इसे प्रकाशित करें ताकि यह वेबसाइट के डाउनलोड बटन पर लाइव हो जाए।', 'Upload the APK, then publish it from the list below to make it live on the website\'s download button.')}</p>
        {errors._form ? <div className="mb-3"><Alert tone="error">{errors._form}</Alert></div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={L('संस्करण नाम (जैसे 1.5.0)', 'Version name (e.g. 1.5.0)')} name="versionName" value={versionName} error={errors.versionName} onChange={(e) => setVersionName(e.target.value)} />
          <Field label={L('संस्करण कोड (जैसे 15)', 'Version code (e.g. 15)')} name="versionCode" value={versionCode} error={errors.versionCode} onChange={(e) => setVersionCode(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('रिलीज़ नोट्स (हिन्दी, वैकल्पिक)', 'Release notes (Hindi, optional)')}</label>
            <textarea value={releaseNotesHi} onChange={(e) => setReleaseNotesHi(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('रिलीज़ नोट्स (English, optional)', 'Release notes (English, optional)')}</label>
            <textarea value={releaseNotesEn} onChange={(e) => setReleaseNotesEn(e.target.value)} className="min-h-[70px] w-full rounded-md border border-line px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('APK फ़ाइल', 'APK file')}</label>
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            {file ? <p className="mt-1 text-xs text-muted">{file.name} · {formatSize(file.size)}</p> : null}
            {errors.file ? <p className="mt-1 text-sm text-danger">{errors.file}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void upload()} loading={uploading} className="w-full">{L('अपलोड करें', 'Upload')}</Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्करण इतिहास', 'Release history')} ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई संस्करण अपलोड नहीं हुआ।', 'No release uploaded yet.')}</p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((r) => {
              const style = STATUS_STYLE[r.status];
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">v{r.versionName}</span>
                      <span className="text-xs text-muted">({L('कोड', 'code')} {r.versionCode})</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${style.bg} ${style.fg}`}>{statusLabel(r.status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatSize(r.sizeBytes)} · {new Date(r.createdAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}
                      {r.publishedAt ? ` · ${L('प्रकाशित', 'published')} ${new Date(r.publishedAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}` : ''}
                    </p>
                    {(hi ? r.releaseNotesHi : r.releaseNotesEn) ? (
                      <p className="mt-1 text-sm text-muted">{hi ? r.releaseNotesHi : r.releaseNotesEn}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'READY' ? (
                      <Button variant="outline" onClick={() => setConfirmingPublishId(r.id)} disabled={busyId === r.id} className="min-h-[36px] px-3 text-xs">
                        {L('प्रकाशित करें', 'Publish')}
                      </Button>
                    ) : null}
                    {r.status === 'READY' || r.status === 'PUBLISHED' ? (
                      <Button variant="outline" onClick={() => void archive(r.id)} disabled={busyId === r.id} className="min-h-[36px] px-3 text-xs">
                        {L('संग्रहीत करें', 'Archive')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!publishingRow}
        title={L('इस संस्करण को प्रकाशित करें?', 'Publish this release?')}
        message={
          publishingRow
            ? L(
                `v${publishingRow.versionName} अब वेबसाइट के डाउनलोड बटन पर तुरंत लाइव हो जाएगा — मौजूदा लाइव संस्करण संग्रहीत कर दिया जाएगा।`,
                `v${publishingRow.versionName} will immediately go live on the website's download button — the current live version will be archived.`,
              )
            : undefined
        }
        confirmLabel={L('प्रकाशित करें', 'Publish')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        busy={!!busyId}
        onConfirm={() => confirmingPublishId && void publish(confirmingPublishId)}
        onCancel={() => setConfirmingPublishId(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
