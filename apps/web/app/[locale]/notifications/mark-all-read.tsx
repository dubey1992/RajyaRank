'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@rajyarank/ui';
import { apiFetch } from '@/lib/api';

export function MarkAllRead({ locale }: { locale: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="min-h-[36px] px-3 text-sm"
      onClick={async () => {
        await apiFetch('/student/notifications/read-all', { method: 'PATCH' }).catch(() => undefined);
        router.refresh();
      }}
    >
      {locale === 'hi' ? 'सभी पढ़ा हुआ चिह्नित करें' : 'Mark all read'}
    </Button>
  );
}
