'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Button, Field } from '@rajyarank/ui';
import { onboardingSchema, type ProfileResponse } from '@rajyarank/contracts';
import { apiFetch, type ApiError } from '@/lib/api';
import { resolveLocale } from '@/lib/i18n';
import { makeT } from '@/lib/t';
import { serverFieldErrors, validate } from '@/lib/form';

interface State { id: string; nameHi: string; nameEn: string }
interface Exam { id: string; nameHi: string; nameEn: string; stateId: string | null }

const QUALS = ['10TH', '12TH', 'GRADUATE', 'POSTGRADUATE', 'TECHNICAL'] as const;

export default function OnboardingPage() {
  const params = useParams<{ locale: string }>();
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const t = makeT(locale);

  const [states, setStates] = useState<State[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stateId, setStateId] = useState('');
  const [targetExamId, setTargetExamId] = useState('');
  const [qualification, setQualification] = useState<(typeof QUALS)[number]>('GRADUATE');
  const [dailyStudyMinutes, setDaily] = useState(120);
  const [institutionCode, setInstitutionCode] = useState('');
  const [institutionNote, setInstitutionNote] = useState<string | null>(null);
  const [myInstitution, setMyInstitution] = useState<ProfileResponse['institution']>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void apiFetch<State[]>('/states').then(setStates).catch(() => undefined);
    void apiFetch<Exam[]>('/exams').then(setExams).catch(() => undefined);
    // Already enrolled by an institution (Academic Head created this account)
    // — the code field below becomes read-only, pre-filled with their own
    // institute's code, instead of an empty field inviting them to join one.
    void apiFetch<ProfileResponse>('/auth/me/profile').then((profile) => {
      if (profile.institution) {
        setMyInstitution(profile.institution);
        setInstitutionCode(profile.institution.accessCode ?? '');
      }
    }).catch(() => undefined);
  }, []);

  const examsForState = exams.filter((e) => !stateId || e.stateId === stateId);

  function goToDashboard() {
    // A plain router.push() here would replay the stale pre-onboarding
    // redirect cached by the client Router Cache (router.refresh() invalidates
    // it, but doesn't return a promise the follow-up push can await, so the
    // two can race — observed in practice: push occasionally wins and lands
    // back on /onboarding with the just-set onboarded state not yet visible).
    // A hard navigation sidesteps the Router Cache entirely — always a fresh
    // server render, no race possible, and this only happens once per student.
    window.location.href = `/${locale}/dashboard`;
  }

  async function skip() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch('/student/onboarding/skip', { method: 'POST' });
      goToDashboard();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
      setBusy(false);
    }
  }

  async function submit() {
    const payload = { stateId, targetExamId, qualification, locale, dailyStudyMinutes, preferredSubjects: [] };
    const errs = validate(onboardingSchema, payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await apiFetch('/student/onboarding', { method: 'POST', body: JSON.stringify(payload) });
      // An institution code is optional and independent of onboarding itself —
      // a wrong/expired code must never block onboarding completion. If it
      // fails, stay on this screen and show the note (with its own "Continue"
      // action) rather than navigating away where the note would go unseen.
      // Already a member (field is read-only, showing their own code) — nothing to join.
      if (!myInstitution && institutionCode.trim()) {
        try {
          await apiFetch('/student/institution/join', { method: 'POST', body: JSON.stringify({ accessCode: institutionCode.trim() }) });
        } catch (e) {
          setInstitutionNote((e as ApiError).message);
          setBusy(false);
          return;
        }
      }
      goToDashboard();
    } catch (e) {
      setErrors(serverFieldErrors(e as ApiError));
      setBusy(false);
    }
  }

  if (institutionNote) {
    return (
      <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <h1 className="mb-1 text-2xl font-black text-navy-950">{hi ? 'चलिए शुरू करें' : "Let's set you up"}</h1>
        <div className="mb-4"><Alert tone="error">{institutionNote}</Alert></div>
        <p className="mb-6 text-sm text-muted">
          {hi ? 'आपकी बाकी प्रोफ़ाइल सहेज ली गई है। आप संस्थान से बाद में प्रोफ़ाइल व सेटिंग्स से जुड़ सकते हैं।' : 'The rest of your profile was saved. You can join an institution later from Profile & Settings.'}
        </p>
        <Button type="button" className="w-full" onClick={goToDashboard}>{t('common.continue')}</Button>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-black text-navy-950">{hi ? 'चलिए शुरू करें' : "Let's set you up"}</h1>
      <p className="mb-6 text-sm text-muted">{t('dashboard.whatToStudy')}</p>

      {errors._form ? <div className="mb-4"><Alert tone="error">{errors._form}</Alert></div> : null}

      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Label text={hi ? 'राज्य' : 'State'}>
          <select className={selectCls} value={stateId} onChange={(e) => { setStateId(e.target.value); setTargetExamId(''); }} required>
            <option value="">{hi ? 'चुनें' : 'Select'}</option>
            {states.map((s) => <option key={s.id} value={s.id}>{hi ? s.nameHi : s.nameEn}</option>)}
          </select>
        </Label>

        <Label text={hi ? 'लक्ष्य परीक्षा' : 'Target exam'}>
          <select className={selectCls} value={targetExamId} onChange={(e) => setTargetExamId(e.target.value)} required>
            <option value="">{hi ? 'चुनें' : 'Select'}</option>
            {examsForState.map((e) => <option key={e.id} value={e.id}>{hi ? e.nameHi : e.nameEn}</option>)}
          </select>
        </Label>

        <Label text={hi ? 'योग्यता' : 'Qualification'}>
          <select className={selectCls} value={qualification} onChange={(e) => setQualification(e.target.value as (typeof QUALS)[number])}>
            {QUALS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </Label>

        <Field
          label={hi ? 'रोज़ कितने मिनट पढ़ेंगे?' : 'Daily study minutes'}
          name="daily"
          type="number"
          min={15}
          max={720}
          value={dailyStudyMinutes}
          error={errors.dailyStudyMinutes}
          onChange={(e) => setDaily(Number(e.target.value))}
        />

        <Label text={myInstitution ? (hi ? 'संस्थान कोड' : 'Institution code') : (hi ? 'संस्थान कोड (वैकल्पिक)' : 'Institution code (optional)')}>
          <input
            value={institutionCode}
            onChange={(e) => setInstitutionCode(e.target.value)}
            placeholder={hi ? 'अपने संस्थान से मिला कोड' : 'Code from your institution'}
            readOnly={!!myInstitution}
            disabled={!!myInstitution}
            className={`${selectCls} ${myInstitution ? 'cursor-not-allowed bg-surface-soft text-muted' : ''}`}
          />
        </Label>
        <p className="-mt-2 mb-4 text-xs text-muted">
          {myInstitution
            ? hi
              ? `आप पहले से ${myInstitution.name} के सदस्य हैं।`
              : `You're already a member of ${myInstitution.name}.`
            : hi
              ? 'इससे आप अपने संस्थान के सदस्य बन जाते हैं — चेकआउट पर दोबारा कोड दर्ज करने की ज़रूरत नहीं पड़ेगी।'
              : "This makes you a member of your institute — you won't need to enter this again at checkout."}
        </p>

        <Button type="submit" loading={busy} className="w-full" disabled={!stateId || !targetExamId}>
          {t('common.continue')}
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void skip()}
          className="mt-3 w-full rounded-md px-3 py-2 text-center text-sm font-bold text-muted hover:bg-surface-soft disabled:opacity-50"
        >
          {hi ? 'अभी नहीं, बाद में करूँगा/करूँगी' : 'Skip for now'}
        </button>
        <p className="mt-1 text-center text-xs text-muted">
          {hi
            ? 'आप यह विवरण बाद में प्रोफ़ाइल व सेटिंग्स से भर सकते हैं।'
            : 'You can fill these details in anytime from Profile & Settings.'}
        </p>
      </form>
    </main>
  );
}

const selectCls = 'mb-4 w-full rounded-md border border-line bg-white px-3 py-3 outline-none focus:border-orange-500';

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-extrabold text-ink">{text}</span>
      {children}
    </label>
  );
}
