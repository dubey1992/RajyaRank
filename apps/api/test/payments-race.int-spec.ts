/**
 * Regression coverage for two payment-security fixes found in a manual
 * review (2026-08-01):
 *
 *  1. createOrder's idempotency-key lookup used to be a bare global lookup
 *     with no owner check, so anyone who knew/guessed another user's key got
 *     back that user's order id/amount/product/Razorpay order id.
 *  2. markPaid() had no locking, and is reachable concurrently from the
 *     client's /verify call plus Razorpay's payment.captured AND order.paid
 *     webhooks (two separate events for one charge) — a race could run the
 *     payment-success side effects (entitlement grant, notification,
 *     settlement transfer to the institute) more than once for one payment.
 *
 * Requires Postgres (docker-compose.ci.yml) + a seeded DB. Run: pnpm test:integration.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import type { Principal } from '@rajyarank/auth';
import { AppModule } from '../src/app.module';
import { PaymentsService } from '../src/payments/payments.service';
import { RazorpayService } from '../src/payments/razorpay.service';

const prisma = new PrismaClient();
let payments: PaymentsService;
let app: INestApplication;

const STUDENT_A = 'seed-student';
const STUDENT_B = 'seed-student-greenvalley';
const PRODUCT_ID = 'seed-product-bpsc';

function principalFor(userId: string): Principal {
  return {
    userId,
    kind: 'STUDENT',
    status: 'ACTIVE',
    roleKeys: ['STUDENT'],
    permissionCodes: new Set(),
    assignments: [],
    assurance: 'AAL1',
    isSuperAdmin: false,
  };
}

beforeAll(async () => {
  // Real signature verification needs live Razorpay keys we don't have in
  // test — swap in a mock that always "verifies" so /verify's own code path
  // (not Razorpay's) is what's under test here.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RazorpayService)
    .useValue({
      keyId: 'rzp_test_key',
      configured: true,
      createOrder: async (_amountMinor: number, _currency: string, receipt: string) => `order_test_${receipt}`,
      verifyPaymentSignature: () => true,
      verifyWebhookSignature: () => false,
      createTransfer: async () => 'trf_test',
    })
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
  payments = app.get(PaymentsService);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('order idempotency key is scoped to its owner', () => {
  it('rejects a second user reusing the first user\'s idempotency key instead of returning their order', async () => {
    const key = `race-test-key-${Date.now()}`;
    const orderA = await payments.createOrder(principalFor(STUDENT_A), { productId: PRODUCT_ID, idempotencyKey: key });
    expect(orderA.orderId).toBeTruthy();

    await expect(payments.createOrder(principalFor(STUDENT_B), { productId: PRODUCT_ID, idempotencyKey: key })).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    // No second order was created under the key, and it's still A's.
    const rows = await prisma.order.findMany({ where: { idempotencyKey: key } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(STUDENT_A);
  });

  it('stays idempotent for the SAME user re-using their own key', async () => {
    const key = `race-test-key-same-${Date.now()}`;
    const first = await payments.createOrder(principalFor(STUDENT_A), { productId: PRODUCT_ID, idempotencyKey: key });
    const second = await payments.createOrder(principalFor(STUDENT_A), { productId: PRODUCT_ID, idempotencyKey: key });
    expect(second.orderId).toBe(first.orderId);
  });
});

describe('concurrent payment confirmations for one order run the payment-success side effects exactly once', () => {
  it('two racing /verify calls for the same order only mark it paid once', async () => {
    const order = await payments.createOrder(principalFor(STUDENT_B), {
      productId: PRODUCT_ID,
      idempotencyKey: `race-concurrent-${Date.now()}`,
    });
    const principal = principalFor(STUDENT_B);
    const verifyDto = { orderId: order.orderId, razorpayPaymentId: `pay_test_${order.orderId}`, razorpaySignature: 'mocked' };

    // Fired concurrently on purpose — this is the exact window /verify plus
    // Razorpay's two webhook event types can all land in for one real charge.
    await Promise.all([payments.verify(principal, verifyDto), payments.verify(principal, verifyDto)]);

    const paidAudits = await prisma.auditLog.count({ where: { targetId: order.orderId, action: 'payment.paid' } });
    expect(paidAudits).toBe(1);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
    expect(finalOrder.status).toBe('PAID');
  });
});
