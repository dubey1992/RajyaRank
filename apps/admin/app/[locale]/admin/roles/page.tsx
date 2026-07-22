import { cookies } from 'next/headers';
import { resolveLocale } from '@/lib/i18n';
import { getMeOrRedirect } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api';
import { can } from '@/lib/permissions';
import { Shell } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { RolePermissionMatrix } from '@/components/RolePermissionMatrix';
import { ACTIVE_ROLE_KEYS } from '@rajyarank/auth';

export const dynamic = 'force-dynamic';

interface PermRow {
  id: string;
  code: string;
  category: string;
  isHighRisk: boolean;
}
interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: { permission: { code: string } }[];
}

export default async function RolesPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';
  const me = await getMeOrRedirect(locale);
  const title = hi ? 'भूमिकाएँ व अनुमतियाँ' : 'Roles & Permissions';

  if (!can(me, 'role.manage')) {
    return (
      <Shell me={me} locale={locale} title={title}>
        <AccessDenied locale={locale} permission="role.manage" />
      </Shell>
    );
  }

  const cookie = cookies().toString();
  const allRoles = (await apiFetchServer<RoleRow[]>('/admin/roles', cookie)) ?? [];
  // Limit the matrix to the currently-active roles (others kept for data only).
  const roles = allRoles.filter((r) => (ACTIVE_ROLE_KEYS as readonly string[]).includes(r.key));
  const perms = (await apiFetchServer<PermRow[]>('/admin/permissions', cookie)) ?? [];

  return (
    <Shell me={me} locale={locale} title={title}>
      <p className="mb-4 max-w-3xl text-sm text-muted">
        {hi
          ? 'यह मैट्रिक्स दिखाता है कि प्रत्येक भूमिका के पास कौन-सी अनुमतियाँ हैं — जो सीधे उस भूमिका के लिए साइड मेनू में क्या दिखता है, यह नियंत्रित करता है। Academic Head/Content Admin/Academic Reviewer संपादन योग्य हैं; Super Admin व Student लॉक हैं।'
          : "This matrix shows which capabilities each role holds — it directly controls what that role sees in the side menu. Academic Head/Content Admin/Academic Reviewer are editable; Super Admin and Student are locked."}
      </p>
      <RolePermissionMatrix roles={roles} perms={perms} locale={locale} />
    </Shell>
  );
}
