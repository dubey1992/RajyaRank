import { resolveLocale } from '@/lib/i18n';
import { LegalPageLayout } from '@/components/LegalPageLayout';

export const dynamic = 'force-static';

export default function RefundPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';

  return (
    <LegalPageLayout locale={locale} titleHi="रिफ़ंड नीति" titleEn="Refund Policy" updatedOn="20 July 2026">
      {hi ? (
        <>
          <p>हम चाहते हैं कि आप अपनी खरीद से संतुष्ट हों। यह नीति बताती है कि कोर्स, टेस्ट सीरीज़ और सदस्यता योजनाओं के लिए रिफ़ंड कब लागू होता है।</p>

          <h2>1. पात्रता विंडो</h2>
          <p>यदि आपने खरीदी गई सामग्री का उपयोग शुरू नहीं किया है (कोई पाठ नहीं देखा, कोई टेस्ट प्रयास नहीं किया), तो आप खरीद के 7 दिनों के भीतर पूर्ण रिफ़ंड के लिए पात्र हैं।</p>

          <h2>2. पात्र नहीं मामले</h2>
          <ul>
            <li>यदि आपने कोई भी पाठ देखा है, PDF डाउनलोड/खोला है, या कोई टेस्ट शुरू किया है।</li>
            <li>7-दिन की विंडो बीत जाने के बाद।</li>
            <li>सदस्यता योजना (Plus/Pro) का उपयोग किया गया समय — केवल अप्रयुक्त, बिना उपयोग किए गए मामलों में विंडो के भीतर विचार किया जाएगा।</li>
          </ul>

          <h2>3. तकनीकी विफलता</h2>
          <p>यदि हमारी ओर से किसी तकनीकी समस्या के कारण आप खरीदी गई सामग्री तक पहुँच नहीं पाए, तो यह पूरी तरह पात्र है, भले ही 7-दिन की विंडो बीत गई हो। कृपया हमें संपर्क पृष्ठ के माध्यम से सूचित करें।</p>

          <h2>4. रिफ़ंड कैसे मांगें</h2>
          <p>अपने ऑर्डर विवरण के साथ हमारे संपर्क पृष्ठ या सहायता अनुभाग के माध्यम से अनुरोध करें। हम आमतौर पर 2 व्यावसायिक दिनों के भीतर समीक्षा करते हैं।</p>

          <h2>5. प्रसंस्करण समय</h2>
          <p>स्वीकृत रिफ़ंड मूल भुगतान माध्यम पर Razorpay के माध्यम से 5–7 व्यावसायिक दिनों में वापस कर दिए जाते हैं।</p>

          <h2>6. संस्थान लाइसेंस</h2>
          <p>संस्थान सदस्यता योजनाओं के रिफ़ंड संबंधित संस्थान के साथ हस्ताक्षरित अनुबंध की शर्तों के अनुसार अलग से नियंत्रित होते हैं — इस नीति के अंतर्गत नहीं।</p>
        </>
      ) : (
        <>
          <p>We want you to be satisfied with your purchase. This policy explains when a refund applies for courses, test series, and subscription plans.</p>

          <h2>1. Eligibility Window</h2>
          <p>If you have not started using the purchased content (no lesson viewed, no test attempted), you are eligible for a full refund within 7 days of purchase.</p>

          <h2>2. Not Eligible</h2>
          <ul>
            <li>If any lesson has been viewed, any PDF opened/downloaded, or any test started.</li>
            <li>After the 7-day window has passed.</li>
            <li>Subscription plan (Plus/Pro) time already used — only genuinely unused subscriptions within the window will be considered.</li>
          </ul>

          <h2>3. Technical Failure</h2>
          <p>If a technical issue on our end prevented you from accessing purchased content, this is fully eligible regardless of the 7-day window. Please let us know via our Contact page.</p>

          <h2>4. How to Request a Refund</h2>
          <p>Reach out via our Contact page or Support section with your order details. We typically review requests within 2 business days.</p>

          <h2>5. Processing Time</h2>
          <p>Approved refunds are returned to the original payment method via Razorpay within 5–7 business days.</p>

          <h2>6. Institution Licences</h2>
          <p>Refunds for institution subscription plans are governed separately by the terms of the signed contract with that institution — not by this policy.</p>
        </>
      )}
    </LegalPageLayout>
  );
}
