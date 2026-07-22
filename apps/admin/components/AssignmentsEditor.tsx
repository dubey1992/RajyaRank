'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import type { StaffDetail, AssignmentView } from '@rajyarank/contracts';

export interface CatalogRef {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
}
type Scope = AssignmentView['scope'];
const SCOPES: Scope[] = ['STATE', 'EXAM', 'COURSE', 'SUBJECT', 'BATCH'];

interface Row {
  uid: number;
  scope: Scope;
  stateId: string;
  examId: string;
  courseId: string;
  subjectId: string;
  batchId: string;
}

let counter = 0;
function toRow(a: AssignmentView): Row {
  return {
    uid: counter++,
    scope: a.scope,
    stateId: a.stateId ?? '',
    examId: a.examId ?? '',
    courseId: a.courseId ?? '',
    subjectId: a.subjectId ?? '',
    batchId: a.batchId ?? '',
  };
}

export function AssignmentsEditor({
  staff,
  states,
  exams,
  locale,
}: {
  staff: StaffDetail;
  states: CatalogRef[];
  exams: CatalogRef[];
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const name = (r: CatalogRef) => (hi ? r.nameHi : r.nameEn);
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(staff.assignments.map(toRow));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const update = (uid: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
  const add = () => setRows((r) => [...r, { uid: counter++, scope: 'STATE', stateId: '', examId: '', courseId: '', subjectId: '', batchId: '' }]);
  const remove = (uid: number) => setRows((r) => r.filter((x) => x.uid !== uid));

  function targetOf(r: Row): string {
    return r.scope === 'STATE' ? r.stateId : r.scope === 'EXAM' ? r.examId : r.scope === 'COURSE' ? r.courseId : r.scope === 'SUBJECT' ? r.subjectId : r.batchId;
  }

  async function save() {
    if (rows.some((r) => !targetOf(r).trim())) {
      setMsg({ tone: 'error', text: L('हर असाइनमेंट के लिए एक लक्ष्य चुनें/दर्ज करें।', 'Select or enter a target for every assignment.') });
      return;
    }
    setBusy(true);
    setMsg(null);
    const assignments = rows.map((r) => ({
      scope: r.scope,
      stateId: r.scope === 'STATE' ? r.stateId : undefined,
      examId: r.scope === 'EXAM' ? r.examId : undefined,
      courseId: r.scope === 'COURSE' ? r.courseId : undefined,
      subjectId: r.scope === 'SUBJECT' ? r.subjectId : undefined,
      batchId: r.scope === 'BATCH' ? r.batchId : undefined,
    }));
    try {
      await apiFetch(`/admin/staff/${staff.id}/assignments`, { method: 'POST', body: JSON.stringify({ assignments }) });
      setMsg({ tone: 'success', text: L('असाइनमेंट सहेजे गए।', 'Assignments saved.') });
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setMsg({
        tone: 'error',
        text:
          err?.code === 'PERMISSION_DENIED'
            ? L('पहुँच अस्वीकृत।', 'Access denied.')
            : err?.code === 'AUTH_MFA_REQUIRED' || err?.code === 'MFA_REQUIRED'
              ? L('इस क्रिया के लिए MFA (AAL2) आवश्यक है।', 'This action requires MFA (AAL2).')
              : err?.message ?? L('सहेजना विफल रहा।', 'Save failed.'),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-lg border border-line bg-white p-5">
      <p className="mb-4 text-sm text-muted">
        {L(
          'असाइनमेंट यह तय करते हैं कि यह स्टाफ़ सदस्य किन राज्यों/परीक्षाओं/कोर्सों पर कार्य कर सकता है। व्यापक असाइनमेंट संकीर्ण को समाहित करता है।',
          'Assignments scope what this staff member can act on. A broader assignment covers narrower resources.',
        )}
      </p>

      {msg ? <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      {rows.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{L('कोई असाइनमेंट नहीं — यह सदस्य किसी संसाधन तक सीमित नहीं है।', 'No assignments yet.')}</p>
      ) : (
        <div className="mb-3 grid gap-2">
          {rows.map((r) => (
            <div key={r.uid} className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2">
              <select
                value={r.scope}
                onChange={(e) => update(r.uid, { scope: e.target.value as Scope })}
                className="rounded-md border border-line px-2 py-1 text-sm"
                aria-label={L('स्कोप', 'Scope')}
              >
                {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              {r.scope === 'STATE' ? (
                <select value={r.stateId} onChange={(e) => update(r.uid, { stateId: e.target.value })} className="min-w-48 flex-1 rounded-md border border-line px-2 py-1 text-sm">
                  <option value="">{L('राज्य चुनें…', 'Select state…')}</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{name(s)} ({s.code})</option>)}
                </select>
              ) : r.scope === 'EXAM' ? (
                <select value={r.examId} onChange={(e) => update(r.uid, { examId: e.target.value })} className="min-w-48 flex-1 rounded-md border border-line px-2 py-1 text-sm">
                  <option value="">{L('परीक्षा चुनें…', 'Select exam…')}</option>
                  {exams.map((x) => <option key={x.id} value={x.id}>{name(x)} ({x.code})</option>)}
                </select>
              ) : (
                <input
                  value={r.scope === 'COURSE' ? r.courseId : r.scope === 'SUBJECT' ? r.subjectId : r.batchId}
                  onChange={(e) =>
                    update(r.uid, r.scope === 'COURSE' ? { courseId: e.target.value } : r.scope === 'SUBJECT' ? { subjectId: e.target.value } : { batchId: e.target.value })
                  }
                  placeholder={L(`${r.scope} आईडी (UUID)`, `${r.scope} ID (UUID)`)}
                  className="min-w-48 flex-1 rounded-md border border-line px-2 py-1 text-sm"
                />
              )}

              <button type="button" onClick={() => remove(r.uid)} className="rounded-md border border-line px-2 py-1 text-xs font-bold text-danger hover:bg-orange-100/50">
                {L('हटाएँ', 'Remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={add} className="text-sm">{L('+ असाइनमेंट जोड़ें', '+ Add assignment')}</Button>
        <Button onClick={() => void save()} loading={busy} className="text-sm">{L('सहेजें', 'Save assignments')}</Button>
      </div>
    </section>
  );
}
