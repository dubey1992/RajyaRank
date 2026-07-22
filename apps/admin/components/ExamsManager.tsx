'use client';
import { useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { serverFieldErrors } from '@/lib/form';

interface Ref { id: string; code: string; nameHi: string; nameEn: string }
export interface ExamRow {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
  examBodyId: string;
  stateId: string | null;
}

const CODE_RE = /^[A-Z0-9_]{2,40}$/;

export function ExamsManager({
  initialExams,
  initialStates,
  initialExamBodies,
  locale,
  orgScoped,
}: {
  initialExams: ExamRow[];
  initialStates: Ref[];
  initialExamBodies: Ref[];
  locale: 'hi' | 'en';
  // States/exam-bodies are shared, platform-wide reference data. Exams are
  // institution-owned — an org-scoped actor (Academic Head) only sees/creates
  // their own institution's exams; platform staff (Content Admin, no orgId)
  // sees/creates the platform-wide set. Both can create exams + exam bodies —
  // only state creation was removed (the dropdown is already fully seeded).
  orgScoped: boolean;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const nm = (r: Ref) => (hi ? r.nameHi : r.nameEn);

  const [exams, setExams] = useState<ExamRow[]>(initialExams);
  const [states] = useState<Ref[]>(initialStates);
  const [bodies, setBodies] = useState<Ref[]>(initialExamBodies);
  const [toast, setToast] = useState<string | null>(null);

  const bodyName = (id: string) => { const b = bodies.find((x) => x.id === id); return b ? nm(b) : id; };
  const stateName = (id: string | null) => { if (!id) return L('अखिल भारतीय', 'All-India'); const s = states.find((x) => x.id === id); return s ? nm(s) : id; };

  // ── Exam form ──
  const [xCode, setXCode] = useState('');
  const [xHi, setXHi] = useState('');
  const [xEn, setXEn] = useState('');
  const [xBody, setXBody] = useState('');
  const [xState, setXState] = useState('');
  const [xBusy, setXBusy] = useState(false);
  const [xErr, setXErr] = useState<Record<string, string>>({});

  async function createExam() {
    const errs: Record<string, string> = {};
    if (!CODE_RE.test(xCode)) errs.code = L('कोड बड़े अक्षर/अंक/अंडरस्कोर।', 'Code: uppercase letters, digits, underscores.');
    if (!xBody) errs.examBodyId = L('परीक्षा निकाय चुनें।', 'Select an exam body.');
    if (!xHi.trim()) errs.nameHi = L('हिन्दी नाम दर्ज करें।', 'Enter the Hindi name.');
    if (!xEn.trim()) errs.nameEn = L('English नाम दर्ज करें।', 'Enter the English name.');
    setXErr(errs);
    if (Object.keys(errs).length) return;
    setXBusy(true);
    try {
      const created = await apiFetch<ExamRow>('/admin/catalogue/exams', {
        method: 'POST',
        body: JSON.stringify({ code: xCode, nameHi: xHi.trim(), nameEn: xEn.trim(), examBodyId: xBody, ...(xState ? { stateId: xState } : {}) }),
      });
      setExams((r) => [created, ...r]);
      setXCode(''); setXHi(''); setXEn(''); setXState(''); setXErr({});
      setToast(L('परीक्षा बनाई गई।', 'Exam created.'));
    } catch (e) {
      setXErr(serverFieldErrors(e as ApiError));
    } finally {
      setXBusy(false);
    }
  }

  // ── Exam body form ──
  const [bCode, setBCode] = useState('');
  const [bHi, setBHi] = useState('');
  const [bEn, setBEn] = useState('');
  const [bBusy, setBBusy] = useState(false);
  const [bErr, setBErr] = useState<Record<string, string>>({});

  async function createBody() {
    const errs: Record<string, string> = {};
    if (!CODE_RE.test(bCode)) errs.code = L('कोड बड़े अक्षर/अंक/अंडरस्कोर।', 'Code: uppercase letters, digits, underscores.');
    if (!bHi.trim()) errs.nameHi = L('हिन्दी नाम दर्ज करें।', 'Enter the Hindi name.');
    if (!bEn.trim()) errs.nameEn = L('English नाम दर्ज करें।', 'Enter the English name.');
    setBErr(errs);
    if (Object.keys(errs).length) return;
    setBBusy(true);
    try {
      const created = await apiFetch<Ref>('/admin/catalogue/exam-bodies', {
        method: 'POST',
        body: JSON.stringify({ code: bCode, nameHi: bHi.trim(), nameEn: bEn.trim() }),
      });
      setBodies((r) => [...r, created].sort((a, b) => a.code.localeCompare(b.code)));
      setBCode(''); setBHi(''); setBEn(''); setBErr({});
      setToast(L('परीक्षा निकाय जोड़ा गया।', 'Exam body added.'));
    } catch (e) {
      setBErr(serverFieldErrors(e as ApiError));
    } finally {
      setBBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('परीक्षाएँ', 'Exams')} ({exams.length})</h2>
        <p className="mb-3 text-sm text-muted">
          {orgScoped
            ? L(
                'यह आपके संस्थान की अपनी परीक्षा सूची है — दाईं ओर से बनाई गई परीक्षाएँ कोर्स बनाते समय चुनी जा सकती हैं।',
                'This is your institution’s own list of exams — exams created here become available when creating a course.',
              )
            : L(
                'यह मंच-व्यापी परीक्षाएँ हैं (कोई संस्थान इनसे जुड़ा नहीं)। संस्थान-विशिष्ट परीक्षाएँ यहाँ नहीं दिखतीं।',
                'These are platform-wide exams (not tied to any institution). Institution-specific exams don’t show up here.',
              )}
        </p>
        {exams.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई परीक्षा नहीं। दाईं ओर से बनाएँ।', 'No exams yet. Create one on the right.')}</p>
        ) : (
          <ul className="grid gap-2">
            {exams.map((x) => (
              <li key={x.id} className="flex items-center justify-between rounded-md border border-line bg-white p-3">
                <div className="min-w-0">
                  <div className="font-bold text-navy-900">{hi ? x.nameHi : x.nameEn}</div>
                  <div className="text-xs text-muted">{x.code} · {bodyName(x.examBodyId)} · {stateName(x.stateId)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नई परीक्षा', 'New exam')}</h2>
          {xErr._form ? <div className="mb-3"><Alert tone="error">{xErr._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void createExam(); }}>
            <Field label={L('कोड', 'Code')} name="code" value={xCode} error={xErr.code} onChange={(e) => setXCode(e.target.value.toUpperCase())} />
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('परीक्षा निकाय', 'Exam body')}</label>
            <select value={xBody} onChange={(e) => setXBody(e.target.value)} className="mb-1 w-full rounded-md border border-line px-3 py-3 text-sm">
              <option value="">{L('निकाय चुनें…', 'Select body…')}</option>
              {bodies.map((b) => <option key={b.id} value={b.id}>{nm(b)}</option>)}
            </select>
            {xErr.examBodyId ? <p className="mb-2 text-sm text-danger">{xErr.examBodyId}</p> : null}
            <label className="mb-1 block text-sm font-extrabold text-ink">{L('राज्य (वैकल्पिक)', 'State (optional)')}</label>
            <select value={xState} onChange={(e) => setXState(e.target.value)} className="mb-2 w-full rounded-md border border-line px-3 py-3 text-sm">
              <option value="">{L('अखिल भारतीय', 'All-India')}</option>
              {states.map((s) => <option key={s.id} value={s.id}>{nm(s)}</option>)}
            </select>
            <Field label={L('नाम (हिन्दी)', 'Name (Hindi)')} name="nameHi" value={xHi} error={xErr.nameHi} onChange={(e) => setXHi(e.target.value)} />
            <Field label={L('नाम (English)', 'Name (English)')} name="nameEn" value={xEn} error={xErr.nameEn} onChange={(e) => setXEn(e.target.value)} />
            <Button type="submit" loading={xBusy} className="w-full">{L('परीक्षा बनाएँ', 'Create exam')}</Button>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('नया परीक्षा निकाय', 'New exam body')}</h2>
          {bErr._form ? <div className="mb-3"><Alert tone="error">{bErr._form}</Alert></div> : null}
          <form noValidate onSubmit={(e) => { e.preventDefault(); void createBody(); }}>
            <Field label={L('कोड', 'Code')} name="code" value={bCode} error={bErr.code} onChange={(e) => setBCode(e.target.value.toUpperCase())} />
            <Field label={L('नाम (हिन्दी)', 'Name (Hindi)')} name="nameHi" value={bHi} error={bErr.nameHi} onChange={(e) => setBHi(e.target.value)} />
            <Field label={L('नाम (English)', 'Name (English)')} name="nameEn" value={bEn} error={bErr.nameEn} onChange={(e) => setBEn(e.target.value)} />
            <Button type="submit" loading={bBusy} className="w-full">{L('निकाय जोड़ें', 'Add exam body')}</Button>
          </form>
        </section>
      </div>

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
