'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, type ApiError } from '@/lib/api';
import { BuyButton } from './BuyButton';
import type { ProductView, CoursePricingView, VerifyInstituteCodeResponse } from '@rajyarank/contracts';

interface PriceLike {
  priceMinor: number;
  originalPriceMinor: number | null;
  validityDays: number | null;
}

function PriceBlock({ product, locale, note }: { product: PriceLike; locale: string; note?: string }) {
  const hi = locale === 'hi';
  return (
    <div>
      {note ? <p className="mb-2 text-xs font-extrabold text-orange-600">{note}</p> : null}
      <div className="flex items-end gap-2">
        <strong className="text-3xl font-black text-navy-950">₹{(product.priceMinor / 100).toLocaleString('en-IN')}</strong>
        {product.originalPriceMinor && product.originalPriceMinor > product.priceMinor ? (
          <span className="text-sm text-muted line-through">₹{(product.originalPriceMinor / 100).toLocaleString('en-IN')}</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">
        {product.validityDays ? (hi ? `${product.validityDays} दिन वैधता` : `${product.validityDays} days validity`) : hi ? 'आजीवन' : 'Lifetime'}
      </p>
    </div>
  );
}

/**
 * Course-detail buy box for institute-owned courses. Public/Institute toggle:
 * a viewer who already qualifies (real org membership, resolved server-side)
 * sees the institute price immediately; anyone else can unlock it by entering
 * the institute's redemption code, verified against the real Organization
 * record — createOrder re-validates the same code server-side at purchase
 * time, so this component's own verify call is only ever a UX preview.
 */
export function InstitutePriceToggle({
  courseId,
  locale,
  publicProduct,
  instituteProduct,
  qualifiesForInstitute,
  isStudent,
}: {
  courseId: string;
  locale: string;
  publicProduct: ProductView | null;
  instituteProduct: CoursePricingView | null;
  qualifiesForInstitute: boolean;
  isStudent: boolean;
}) {
  const hi = locale === 'hi';
  const [mode, setMode] = useState<'public' | 'institute'>('public');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState<{ product: ProductView; orgName: string } | null>(null);

  async function verify() {
    if (!code.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await apiFetch<VerifyInstituteCodeResponse>(`/courses/${courseId}/verify-institute-code`, {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.valid && res.product) {
        setVerified({ product: res.product, orgName: res.orgName ?? '' });
      } else {
        setVerifyError(hi ? 'अमान्य संस्थान कोड।' : 'Invalid institute code.');
      }
    } catch (e) {
      setVerifyError((e as ApiError).message);
    } finally {
      setVerifying(false);
    }
  }

  const autoInstitute = qualifiesForInstitute && instituteProduct ? instituteProduct : null;

  return (
    <div className="mt-5 max-w-xs rounded-lg border border-line bg-white p-5">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('public')}
          className={`rounded-md border px-3 py-2 text-xs font-extrabold ${mode === 'public' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-line text-muted'}`}
        >
          {hi ? 'सार्वजनिक विद्यार्थी' : 'Public student'}
        </button>
        <button
          type="button"
          onClick={() => setMode('institute')}
          className={`rounded-md border px-3 py-2 text-xs font-extrabold ${mode === 'institute' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-line text-muted'}`}
        >
          {hi ? 'संस्थान विद्यार्थी' : 'Institute student'}
        </button>
      </div>

      {mode === 'public' ? (
        publicProduct ? (
          <>
            <PriceBlock product={publicProduct} locale={locale} />
            <div className="mt-4">
              {isStudent ? (
                <BuyButton productId={publicProduct.id} locale={locale} />
              ) : (
                <Link href={`/${locale}/login`} className="block rounded-md bg-orange-500 px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-orange-600">
                  {hi ? 'खरीदने हेतु लॉगिन करें' : 'Log in to buy'}
                </Link>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{hi ? 'सार्वजनिक मूल्य जल्द उपलब्ध होगा।' : 'Public pricing coming soon.'}</p>
        )
      ) : autoInstitute ? (
        <>
          <PriceBlock product={autoInstitute} locale={locale} note={hi ? 'आपके संस्थान का विशेष मूल्य' : 'Your institute’s special price'} />
          <div className="mt-4">
            <BuyButton productId={autoInstitute.id!} locale={locale} />
          </div>
        </>
      ) : verified ? (
        <>
          <PriceBlock product={verified.product} locale={locale} note={hi ? `सत्यापित — ${verified.orgName}` : `Verified — ${verified.orgName}`} />
          <div className="mt-4">
            {isStudent ? (
              <BuyButton productId={verified.product.id} locale={locale} accessCode={code.trim()} />
            ) : (
              <Link href={`/${locale}/login`} className="block rounded-md bg-orange-500 px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-orange-600">
                {hi ? 'खरीदने हेतु लॉगिन करें' : 'Log in to buy'}
              </Link>
            )}
          </div>
        </>
      ) : (
        <div>
          <p className="mb-2 text-xs text-muted">
            {hi ? 'अपने संस्थान से मिला विशेष मूल्य अनलॉक करने हेतु संस्थान कोड दर्ज करें।' : 'Enter the code your institute gave you to unlock their special price.'}
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={hi ? 'संस्थान कोड' : 'Institute code'}
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
          {verifyError ? <p className="mt-1 text-xs font-bold text-danger">{verifyError}</p> : null}
          <button
            type="button"
            disabled={verifying || !code.trim()}
            onClick={() => void verify()}
            className="mt-2 w-full rounded-md border border-line bg-surface-soft px-4 py-2 text-sm font-extrabold text-navy-900 hover:bg-line disabled:opacity-50"
          >
            {verifying ? (hi ? 'सत्यापित हो रहा है…' : 'Verifying…') : hi ? 'संस्थान एक्सेस सत्यापित करें' : 'Verify institute access'}
          </button>
        </div>
      )}
    </div>
  );
}
