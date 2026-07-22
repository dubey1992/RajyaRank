'use client';
import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, ConfirmDialog, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';
import { roleLabel, permissionLabel, permissionDesc } from '@/lib/labels';
import type { Locale } from '@/lib/i18n';

interface PermRow { id: string; code: string; category: string; isHighRisk: boolean }
interface RoleRow { id: string; key: string; name: string; description: string | null; permissions: { permission: { code: string } }[] }

/** Matches the server-side lock in staff-admin.service.ts (updateRolePermissions):
 *  SUPER_ADMIN is locked to prevent editing your own access away from the same
 *  screen that controls it; STUDENT holds no permissions by design. */
const EDITABLE_ROLE_KEYS = new Set(['ACADEMIC_HEAD', 'CONTENT_ADMIN', 'ACADEMIC_REVIEWER']);

function codesOf(role: RoleRow): Set<string> {
  return new Set(role.permissions.map((p) => p.permission.code));
}

export function RolePermissionMatrix({ roles, perms, locale }: { roles: RoleRow[]; perms: PermRow[]; locale: Locale }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const router = useRouter();

  const [pending, setPending] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const r of roles) init[r.id] = codesOf(r);
    return init;
  });
  const [confirmRoleId, setConfirmRoleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byCategory = new Map<string, PermRow[]>();
  for (const p of perms) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }

  function toggle(roleId: string, code: string) {
    setPending((prev) => {
      const next = new Set(prev[roleId]);
      if (next.has(code)) next.delete(code); else next.add(code);
      return { ...prev, [roleId]: next };
    });
  }

  function isDirty(role: RoleRow): boolean {
    const original = codesOf(role);
    const current = pending[role.id] ?? new Set<string>();
    if (original.size !== current.size) return true;
    for (const c of original) if (!current.has(c)) return true;
    return false;
  }

  function diffSummary(role: RoleRow): string {
    const original = codesOf(role);
    const current = pending[role.id] ?? new Set<string>();
    const gained = [...current].filter((c) => !original.has(c)).map((c) => permissionLabel(c, locale));
    const lost = [...original].filter((c) => !current.has(c)).map((c) => permissionLabel(c, locale));
    const parts: string[] = [];
    if (gained.length) parts.push(L(`प्राप्त होगा: ${gained.join(', ')}`, `Will gain: ${gained.join(', ')}`));
    if (lost.length) parts.push(L(`खोएगा: ${lost.join(', ')}`, `Will lose: ${lost.join(', ')}`));
    return parts.join(' · ') || L('कोई बदलाव नहीं।', 'No changes.');
  }

  async function save(role: RoleRow) {
    setBusy(true); setError(null);
    try {
      await apiFetch(`/admin/roles/${role.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionCodes: [...(pending[role.id] ?? new Set<string>())] }),
      });
      setToast(L(`${roleLabel(role.key, locale)} की अनुमतियाँ सहेजी गईं।`, `${roleLabel(role.key, locale)}'s permissions saved.`));
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setError(
        err?.code === 'AUTH_MFA_REQUIRED' || err?.code === 'MFA_REQUIRED'
          ? L('इस क्रिया के लिए MFA (AAL2) आवश्यक है — कृपया दोबारा साइन इन करें और फिर से प्रयास करें।', 'This action requires MFA (AAL2) — please sign in again and retry.')
          : (err?.message ?? L('सहेजना विफल रहा।', 'Save failed.')),
      );
    } finally {
      setBusy(false);
      // Always close the confirm dialog — on failure it's a full-screen overlay
      // (z-50) that would otherwise sit on top of the error Alert and hide it,
      // making a failed save look like it silently did nothing.
      setConfirmRoleId(null);
    }
  }

  const confirmRole = roles.find((r) => r.id === confirmRoleId) ?? null;

  return (
    <div>
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-line bg-surface-soft">
            <tr>
              <th className="sticky left-0 bg-surface-soft px-3 py-2 text-xs uppercase text-muted">{L('अनुमति', 'Permission')}</th>
              {roles.map((r) => {
                const editable = EDITABLE_ROLE_KEYS.has(r.key);
                return (
                  <th key={r.id} className="px-3 py-2 text-center align-top" title={r.description ?? r.name}>
                    <div className="text-xs font-extrabold text-navy-900">
                      {roleLabel(r.key, locale)}
                      {!editable ? (
                        <span className="ml-1" title={L('लॉक — इस स्क्रीन से संपादन योग्य नहीं', 'Locked — not editable from this screen')}>🔒</span>
                      ) : null}
                    </div>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRoleId(r.id)}
                        disabled={!isDirty(r)}
                        className="mt-1 rounded-md border border-line px-2 py-0.5 text-[10px] font-bold text-navy-900 hover:bg-surface-soft disabled:opacity-40"
                      >
                        {L('सहेजें', 'Save')}
                      </button>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...byCategory.entries()].map(([category, list]) => (
              <Fragment key={category}>
                <tr className="bg-navy-100/40">
                  <td colSpan={roles.length + 1} className="px-3 py-1 text-xs font-black uppercase tracking-wide text-navy-900">
                    {category}
                  </td>
                </tr>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-line/60">
                    <td className="sticky left-0 bg-white px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{permissionLabel(p.code, locale)}</span>
                        {p.isHighRisk ? (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-danger">
                            {L('उच्च-जोखिम', 'HIGH-RISK')}
                          </span>
                        ) : null}
                      </div>
                      {permissionDesc(p.code, locale) ? (
                        <div className="text-[11px] text-muted">{permissionDesc(p.code, locale)}</div>
                      ) : null}
                    </td>
                    {roles.map((r) => {
                      const editable = EDITABLE_ROLE_KEYS.has(r.key);
                      const checked = pending[r.id]?.has(p.code) ?? false;
                      return (
                        <td key={r.id} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!editable}
                            onChange={() => toggle(r.id, p.code)}
                            aria-label={`${roleLabel(r.key, locale)} · ${permissionLabel(p.code, locale)}`}
                            className="h-4 w-4 accent-orange-500 disabled:opacity-40"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmRole}
        title={confirmRole ? L(`${roleLabel(confirmRole.key, locale)} की अनुमतियाँ बदलें?`, `Change ${roleLabel(confirmRole.key, locale)}'s permissions?`) : ''}
        message={confirmRole ? diffSummary(confirmRole) : undefined}
        confirmLabel={L('पुष्टि करें व सहेजें', 'Confirm & save')}
        cancelLabel={L('रद्द करें', 'Cancel')}
        busy={busy}
        onConfirm={() => confirmRole && void save(confirmRole)}
        onCancel={() => setConfirmRoleId(null)}
      />
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </div>
  );
}
