import { Alert } from '@rajyarank/ui';

/** Bilingual permission-denied state. Rendered when the UI knows the staff
 *  member lacks a capability; the backend independently returns 403
 *  PERMISSION_DENIED for any protected action regardless of what we render. */
export function AccessDenied({ locale, permission }: { locale: 'hi' | 'en'; permission?: string }) {
  const hi = locale === 'hi';
  return (
    <div className="max-w-lg">
      <Alert tone="error">
        <strong className="block">
          {hi ? 'पहुँच अस्वीकृत' : 'Access denied'}
        </strong>
        <span className="text-sm">
          {hi
            ? 'आपके पास इस अनुभाग को देखने की अनुमति नहीं है। यदि आपको पहुँच चाहिए तो अपने प्रशासक से संपर्क करें।'
            : 'You do not have permission to view this section. Contact your administrator if you need access.'}
        </span>
        {permission ? (
          <span className="mt-1 block text-xs text-muted">
            {hi ? 'आवश्यक अनुमति' : 'Required permission'}: <code>{permission}</code>
          </span>
        ) : null}
      </Alert>
    </div>
  );
}
