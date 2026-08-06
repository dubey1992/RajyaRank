import { InvitationsService } from './invitations.service';
import type { Principal } from '@rajyarank/auth';
import type { ApiEnv } from '@rajyarank/config/env';
import type { AuditService } from '../audit/audit.service';
import type { NotifierService } from '../notifications/notifier.service';
import type { NotificationService } from '../notifications/notification.service';
import type { PrismaService } from '../prisma/prisma.service';

function makeService(appEnv: ApiEnv['APP_ENV']) {
  const env = { APP_ENV: appEnv, ADMIN_PUBLIC_URL: 'https://admin.example.com', INVITATION_TTL_HOURS: 48 } as ApiEnv;
  // These never get touched when the env guard fires first — asserting that
  // is the point of the test, so undefined stand-ins are enough.
  const prisma = undefined as unknown as PrismaService;
  const audit = undefined as unknown as AuditService;
  const notifier = undefined as unknown as NotifierService;
  const notifications = undefined as unknown as NotificationService;
  return new InvitationsService(env, prisma, audit, notifier, notifications);
}

const actor = { userId: 'admin-1' } as Principal;

describe('InvitationsService.adminSetPasswordAndAccept — non-production only', () => {
  it('refuses in production without touching the database', async () => {
    const service = makeService('production');
    await expect(service.adminSetPasswordAndAccept(actor, 'inv-1', 'Whatever123!')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses in preproduction too', async () => {
    const service = makeService('preproduction');
    await expect(service.adminSetPasswordAndAccept(actor, 'inv-1', 'Whatever123!')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
