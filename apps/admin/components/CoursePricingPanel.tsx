'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Field, Toast } from '@rajyarank/ui';
import { apiFetch, type ApiError } from '@/lib/api';

interface CoursePricingView {
  id: string | null;
  priceMinor: number;
  originalPriceMinor: number | null;
  currency: string;
  validityDays: number | null;
  accessType: string;
  active: boolean;
  audience: string;
}

interface CouponView {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  redeemedCount: number;
}

function usePricingForm(courseId: string, audience: 'PUBLIC' | 'INSTITUTE') {
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<'free' | 'paid'>('free');
  const [priceRupees, setPriceRupees] = useState('');
  const [originalPriceRupees, setOriginalPriceRupees] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<CoursePricingView>(`/admin/courses/${courseId}/pricing?audience=${audience}`).then((p) => {
      setMode(p.accessType === 'FREE' ? 'free' : 'paid');
      setPriceRupees(p.priceMinor ? String(p.priceMinor / 100) : '');
      setOriginalPriceRupees(p.originalPriceMinor ? String(p.originalPriceMinor / 100) : '');
      setValidityDays(p.validityDays ? String(p.validityDays) : '');
      setActive(p.active);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [courseId, audience]);

  async function save() {
    setBusy(true);
    await apiFetch(`/admin/courses/${courseId}/pricing`, {
      method: 'PUT',
      body: JSON.stringify({
        priceMinor: mode === 'free' ? 0 : Math.round(Number(priceRupees) * 100),
        ...(mode === 'paid' && originalPriceRupees ? { originalPriceMinor: Math.round(Number(originalPriceRupees) * 100) } : {}),
        ...(mode === 'paid' && validityDays ? { validityDays: Number(validityDays) } : {}),
        accessType: mode === 'free' ? 'FREE' : 'PAID',
        active,
        audience,
      }),
    }).finally(() => setBusy(false));
  }

  return { loaded, mode, setMode, priceRupees, setPriceRupees, originalPriceRupees, setOriginalPriceRupees, validityDays, setValidityDays, active, setActive, busy, save };
}

function PricingForm({
  title, form, locale, onSaved, onError,
}: {
  title: string;
  form: ReturnType<typeof usePricingForm>;
  locale: 'hi' | 'en';
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  if (!form.loaded) return null;
  return (
    <div>
      <h3 className="mb-3 text-base font-black text-navy-900">{title}</h3>
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => form.setMode('free')} className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold ${form.mode === 'free' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-line text-muted'}`}>{L('नि:शुल्क', 'Free')}</button>
        <button type="button" onClick={() => form.setMode('paid')} className={`flex-1 rounded-md border px-3 py-2 text-sm font-bold ${form.mode === 'paid' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-line text-muted'}`}>{L('सशुल्क', 'Paid')}</button>
      </div>
      {form.mode === 'paid' ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label={L('विक्रय मूल्य (₹) *', 'Selling price (₹) *')} name="price" inputMode="numeric" value={form.priceRupees} onChange={(e) => form.setPriceRupees(e.target.value.replace(/\D/g, ''))} />
          <Field label={L('मूल मूल्य (₹, वैकल्पिक)', 'Original price (₹, optional)')} name="originalPrice" inputMode="numeric" value={form.originalPriceRupees} onChange={(e) => form.setOriginalPriceRupees(e.target.value.replace(/\D/g, ''))} />
          <Field label={L('वैधता (दिन, वैकल्पिक)', 'Validity (days, optional)')} name="validity" inputMode="numeric" value={form.validityDays} onChange={(e) => form.setValidityDays(e.target.value.replace(/\D/g, ''))} />
        </div>
      ) : null}
      <label className="mb-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.active} onChange={(e) => form.setActive(e.target.checked)} />
        {L('सक्रिय (छात्रों को दिखाई देगा)', 'Active (visible to students)')}
      </label>
      <Button
        onClick={() => void form.save().then(onSaved).catch((e) => onError((e as ApiError)?.message ?? L('सहेजना विफल रहा।', 'Save failed.')))}
        loading={form.busy}
        disabled={form.mode === 'paid' && !form.priceRupees}
        className="text-sm"
      >
        {L('मूल्य निर्धारण सहेजें', 'Save pricing')}
      </Button>
    </div>
  );
}

export function CoursePricingPanel({ courseId, locale, hasOrg }: { courseId: string; locale: 'hi' | 'en'; hasOrg: boolean }) {
  const hi = locale === 'hi';
  const L = (h: string, e: string) => (hi ? h : e);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const publicForm = usePricingForm(courseId, 'PUBLIC');
  const instituteForm = usePricingForm(courseId, 'INSTITUTE');

  const [coupons, setCoupons] = useState<CouponView[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [couponValue, setCouponValue] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    apiFetch<CouponView[]>(`/admin/coupons?courseId=${courseId}`).then(setCoupons).catch(() => setCoupons([]));
  }, [courseId]);

  async function createCoupon() {
    setCouponBusy(true); setError(null);
    try {
      const value = couponType === 'FIXED' ? Math.round(Number(couponValue) * 100) : Number(couponValue);
      const created = await apiFetch<CouponView>('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), type: couponType, value, courseId, active: true }),
      });
      setCoupons([created, ...coupons]);
      setCouponCode(''); setCouponValue('');
      setToast(L('कूपन बनाया गया।', 'Coupon created.'));
    } catch (e) {
      const err = e as ApiError;
      setError(err?.code === 'CONFLICT' ? L('यह कूपन कोड पहले से मौजूद है।', 'This coupon code already exists.') : err?.message ?? L('कूपन बनाना विफल रहा।', 'Coupon creation failed.'));
    } finally {
      setCouponBusy(false);
    }
  }

  if (!publicForm.loaded) return null;

  return (
    <div className="mt-6 rounded-lg border border-line bg-white p-5">
      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}

      <div className={hasOrg ? 'grid gap-6 sm:grid-cols-2' : ''}>
        <PricingForm
          title={hasOrg ? L('सार्वजनिक मूल्य', 'Public price') : L('मूल्य निर्धारण', 'Pricing')}
          form={publicForm}
          locale={locale}
          onSaved={() => setToast(L('मूल्य निर्धारण सहेजा गया।', 'Pricing saved.'))}
          onError={setError}
        />
        {hasOrg ? (
          <div>
            <PricingForm
              title={L('संस्थान मूल्य', 'Institute price')}
              form={instituteForm}
              locale={locale}
              onSaved={() => setToast(L('मूल्य निर्धारण सहेजा गया।', 'Pricing saved.'))}
              onError={setError}
            />
            <p className="mt-2 text-xs text-muted">{L('यह मूल्य केवल इस कोर्स के स्वामी संस्थान के नामांकित छात्रों को दिखेगा।', 'Only shown to and purchasable by this course’s own institute’s enrolled students.')}</p>
          </div>
        ) : null}
      </div>

      <hr className="my-5 border-line" />

      <h3 className="mb-3 text-base font-black text-navy-900">{L('कूपन', 'Coupons')}</h3>
      {coupons.length ? (
        <ul className="mb-3 grid gap-1 text-sm">
          {coupons.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
              <span className="font-bold text-ink">{c.code}</span>
              <span className="text-xs text-muted">{c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value / 100}`} · {L('प्रयुक्त', 'used')} {c.redeemedCount}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted">{L('अभी कोई कूपन नहीं।', 'No coupons yet.')}</p>
      )}
      <div className="grid grid-cols-4 gap-2">
        <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder={L('कोड', 'CODE')} className="rounded-md border border-line px-3 py-2 text-sm" />
        <select value={couponType} onChange={(e) => setCouponType(e.target.value as typeof couponType)} className="rounded-md border border-line px-2 py-2 text-sm">
          <option value="PERCENT">%</option>
          <option value="FIXED">₹</option>
        </select>
        <input value={couponValue} inputMode="numeric" onChange={(e) => setCouponValue(e.target.value.replace(/\D/g, ''))} placeholder={couponType === 'PERCENT' ? L('% में', '10 (%)') : L('₹ में', '500 (₹)')} className="rounded-md border border-line px-3 py-2 text-sm" />
        <Button variant="outline" onClick={() => void createCoupon()} loading={couponBusy} disabled={!couponCode.trim() || !couponValue} className="text-sm">
          {L('+ जोड़ें', '+ Add')}
        </Button>
      </div>
    </div>
  );
}
