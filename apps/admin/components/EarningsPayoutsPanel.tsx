import type { InstitutionEarningsView, KycSubmissionView } from '@rajyarank/contracts';
import { KycSubmissionForm } from './KycSubmissionForm';

function rupees(minor: number) {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

export function EarningsPayoutsPanel({
  earnings,
  kyc,
  locale,
}: {
  earnings: InstitutionEarningsView;
  kyc: KycSubmissionView | null;
  locale: 'hi' | 'en';
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const grossMinor = earnings.internalGrossMinor + earnings.externalGrossMinor;
  const feeMinor = earnings.internalFeeMinor + earnings.externalFeeMinor;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कुल छात्र बिक्री', 'Gross student sales')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(grossMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('कटौती', 'Deductions')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(feeMinor + earnings.gatewayFeeMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('उपलब्ध भुगतान', 'Available payout')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(earnings.payableMinor)}</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('रिज़र्व होल्ड', 'Reserve held')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(earnings.reserveHeldMinor)}</div>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-100/40 p-4">
          <div className="text-xs font-extrabold uppercase text-muted">{L('बैंक में निपटाया गया', 'Settled to bank')}</div>
          <div className="mt-1.5 text-2xl font-black text-navy-950">{rupees(earnings.bankSettledMinor)}</div>
        </div>
      </div>

      {earnings.heldMinor > 0 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm">
          <p className="font-extrabold text-orange-700">
            {L(`${rupees(earnings.heldMinor)} भुगतान समीक्षाधीन है`, `${rupees(earnings.heldMinor)} pending reconciliation`)}
          </p>
          <p className="mt-1 text-orange-700">
            {L(
              'ये बिक्री सफलतापूर्वक हुई और छात्र को एक्सेस मिल गया, लेकिन भुगतान विभाजन तकनीकी कारण से पूरा नहीं हो सका। हमारी टीम इसे जल्द ठीक करेगी।',
              'These sales completed and the student got access, but the payout split could not go through for a technical reason. Our team will reconcile this shortly.',
            )}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('भुगतान विवरण', 'Payout statement')}</h2>
          <div className="grid gap-0 rounded-lg border border-line bg-surface-soft p-3 text-sm">
            <div className="flex justify-between border-b border-line py-2"><span>{L('आंतरिक ऑर्डर सकल', 'Internal order gross')}</span><b>{rupees(earnings.internalGrossMinor)}</b></div>
            <div className="flex justify-between border-b border-line py-2"><span>{L('बाहरी ऑर्डर सकल', 'External order gross')}</span><b>{rupees(earnings.externalGrossMinor)}</b></div>
            <div className="flex justify-between border-b border-line py-2"><span>{L('आंतरिक तकनीकी शुल्क', 'Internal technology fees')}</span><b>− {rupees(earnings.internalFeeMinor)}</b></div>
            <div className="flex justify-between border-b border-line py-2"><span>{L('मार्केटप्लेस कमीशन', 'Marketplace commission')}</span><b>− {rupees(earnings.externalFeeMinor)}</b></div>
            <div className="flex justify-between border-b border-line py-2"><span>{L('भुगतान लागत', 'Payment costs')}</span><b>− {rupees(earnings.gatewayFeeMinor)}</b></div>
            <div className="flex justify-between border-b border-line py-2"><span>{L('रिफ़ंड रिज़र्व होल्ड', 'Refund reserve held')}</span><b>− {rupees(earnings.reserveHeldMinor)}</b></div>
            <div className="flex justify-between py-2 text-base font-black"><span>{L('निपटान देय', 'Settlement payable')}</span><b>{rupees(earnings.payableMinor)}</b></div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('भुगतान स्थिति', 'Payout status')}</h2>
          {earnings.linkedAccount ? (
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-md border border-line p-3">
                <div>
                  <div className="font-bold text-ink">{L('लिंक्ड खाता', 'Linked account')}</div>
                  <div className="text-xs text-muted">{earnings.linkedAccount.razorpayAccountId ?? '—'}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                    earnings.linkedAccount.kycStatus === 'VERIFIED'
                      ? 'bg-teal-100 text-success'
                      : earnings.linkedAccount.kycStatus === 'REJECTED'
                        ? 'bg-orange-100 text-danger'
                        : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {earnings.linkedAccount.kycStatus}
                </span>
              </div>
              <p className="text-xs text-muted">
                {earnings.linkedAccount.payoutsEnabled
                  ? L('भुगतान सक्षम हैं — बिक्री स्वतः विभाजित व निपटित होती है।', 'Payouts are enabled — sales split and settle automatically.')
                  : earnings.linkedAccount.kycStatus === 'REJECTED'
                    ? L('KYC अस्वीकृत — नीचे कारण देखें और दोबारा सबमिट करें।', 'KYC rejected — see the reason below and resubmit.')
                    : L('भुगतान अभी सक्षम नहीं — नीचे अपना KYC विवरण सबमिट करें।', "Payouts not yet enabled — submit your KYC details below.")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">{L('भुगतान सक्षम करने के लिए नीचे KYC विवरण सबमिट करें।', 'Submit your KYC details below to enable payouts.')}</p>
          )}
        </section>
      </div>

      {!earnings.linkedAccount?.payoutsEnabled ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('संस्थान KYC', 'Institution KYC')}</h2>
          <KycSubmissionForm initial={kyc} defaultLegalName={earnings.linkedAccount?.orgName ?? ''} locale={locale} />
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-lg font-extrabold text-navy-900">{L('हाल के ऑर्डर निपटान', 'Recent order settlements')} ({earnings.transfers.length})</h2>
        {earnings.transfers.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई निपटान नहीं।', 'No settlements yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('उत्पाद', 'Product')}</th>
                  <th className="px-3 py-2">{L('चैनल', 'Channel')}</th>
                  <th className="px-3 py-2">{L('सकल', 'Gross')}</th>
                  <th className="px-3 py-2">{L('शुद्ध', 'Net')}</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {earnings.transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-bold text-ink">{t.productTitle}</td>
                    <td className="px-3 py-2">{t.audience === 'INSTITUTE' ? L('आंतरिक', 'Internal') : L('बाहरी', 'External')}</td>
                    <td className="px-3 py-2">{rupees(t.grossMinor)}</td>
                    <td className="px-3 py-2 font-bold">{rupees(t.netMinor)}</td>
                    <td className="px-3 py-2">
                      {t.status === 'ON_HOLD' ? (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-700">{L('समीक्षाधीन', 'Pending')}</span>
                      ) : t.status === 'REVERSED' ? (
                        <span className="rounded-full bg-line px-2 py-0.5 text-xs font-extrabold text-muted">{L('उलटा', 'Reversed')}</span>
                      ) : (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-success">{L('निपटाया', 'Settled')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 text-lg font-extrabold text-navy-900">{L('बैंक निपटान', 'Bank settlements')} ({earnings.settlements.length})</h2>
        <p className="mb-3 text-xs text-muted">
          {L(
            'ऊपर "निपटाया" का मतलब है कि बिक्री का हिस्सा आपके लिंक्ड खाते में ट्रांसफर हो गया — यह वास्तव में Razorpay द्वारा आपके बैंक खाते में भुगतान होने से अलग है, जो यहाँ दिखता है।',
            'The "Settled" status above just means the sale\'s share was transferred into your linked account — this is the actual list of Razorpay paying that money out to your real bank account.',
          )}
        </p>
        {earnings.settlements.length === 0 ? (
          <p className="text-sm text-muted">{L('अभी कोई बैंक निपटान नहीं।', 'No bank settlements yet.')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-soft text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">{L('राशि', 'Amount')}</th>
                  <th className="px-3 py-2">{L('शुल्क', 'Fees')}</th>
                  <th className="px-3 py-2">{L('कर', 'Tax')}</th>
                  <th className="px-3 py-2">UTR</th>
                  <th className="px-3 py-2">{L('स्थिति', 'Status')}</th>
                  <th className="px-3 py-2">{L('निपटान तिथि', 'Settled on')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {earnings.settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-bold text-ink">{rupees(s.amountMinor)}</td>
                    <td className="px-3 py-2">{rupees(s.feesMinor)}</td>
                    <td className="px-3 py-2">{rupees(s.taxMinor)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.utr ?? '—'}</td>
                    <td className="px-3 py-2">
                      {s.status === 'PROCESSED' ? (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-success">{L('निपटाया', 'Settled')}</span>
                      ) : (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-danger">{L('विफल', 'Failed')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{new Date(s.settledAt).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
