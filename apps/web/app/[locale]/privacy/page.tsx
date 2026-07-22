import { resolveLocale } from '@/lib/i18n';
import { LegalPageLayout } from '@/components/LegalPageLayout';

export const dynamic = 'force-static';

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';

  return (
    <LegalPageLayout locale={locale} titleHi="गोपनीयता नीति" titleEn="Privacy Policy" updatedOn="20 July 2026">
      {hi ? (
        <>
          <p>यह नीति बताती है कि RajyaRank आपकी जानकारी कैसे एकत्र, उपयोग और सुरक्षित करता है।</p>

          <h2>1. हम क्या एकत्र करते हैं</h2>
          <ul>
            <li>खाता जानकारी: नाम, मोबाइल नंबर, ईमेल, लक्ष्य परीक्षा।</li>
            <li>उपयोग डेटा: पाठ प्रगति, टेस्ट अंक, अध्ययन समय — ताकि हम आपकी अध्ययन योजना को व्यक्तिगत बना सकें।</li>
            <li>भुगतान मेटाडेटा: ऑर्डर व लेन-देन आईडी। हम आपके कार्ड/बैंक विवरण कभी संग्रहीत नहीं करते — वह सीधे Razorpay द्वारा संभाला जाता है।</li>
            <li>संचार: सपोर्ट टिकट, संपर्क फ़ॉर्म संदेश, और डाउट सबमिशन।</li>
          </ul>

          <h2>2. हम इसका उपयोग कैसे करते हैं</h2>
          <p>आपकी जानकारी का उपयोग सेवा प्रदान करने, आपकी प्रगति ट्रैक करने, भुगतान संसाधित करने, ज़रूरी सूचनाएँ (OTP, परीक्षा अलर्ट, भुगतान रसीद) भेजने और सहायता प्रदान करने के लिए किया जाता है। हम आपका डेटा किसी तीसरे पक्ष को विज्ञापन के लिए नहीं बेचते।</p>

          <h2>3. तृतीय-पक्ष सेवाएँ</h2>
          <p>हम भुगतान के लिए Razorpay, SMS/OTP के लिए SMS गेटवे, ईमेल के लिए SMTP प्रदाता, और फ़ाइल भंडारण के लिए क्लाउड स्टोरेज का उपयोग करते हैं। ये सेवाएँ केवल उतना डेटा प्राप्त करती हैं जितना उनके कार्य के लिए आवश्यक है।</p>

          <h2>4. कुकीज़ व सत्र</h2>
          <p>हम आपको साइन-इन रखने के लिए आवश्यक सत्र कुकीज़ का उपयोग करते हैं। हम तृतीय-पक्ष विज्ञापन-ट्रैकिंग कुकीज़ का उपयोग नहीं करते।</p>

          <h2>5. डेटा प्रतिधारण</h2>
          <p>हम आपका डेटा तब तक रखते हैं जब तक आपका खाता सक्रिय है, या कानूनी/लेखा आवश्यकताओं के लिए आवश्यक हो। आप खाता हटाने का अनुरोध कर सकते हैं।</p>

          <h2>6. आपके अधिकार</h2>
          <p>आप अपनी जानकारी तक पहुँच, उसे सही करने, या हटाने का अनुरोध कर सकते हैं — अपने प्रोफ़ाइल पेज से या हमारे संपर्क पृष्ठ के माध्यम से।</p>

          <h2>7. नाबालिगों की गोपनीयता</h2>
          <p>18 वर्ष से कम आयु के उपयोगकर्ताओं का डेटा अभिभावक की सहमति से ही एकत्र किया जाता है।</p>

          <h2>8. सुरक्षा</h2>
          <p>हम आपके डेटा की सुरक्षा के लिए एन्क्रिप्शन, एक्सेस नियंत्रण और नियमित सुरक्षा समीक्षा का उपयोग करते हैं।</p>

          <h2>9. संपर्क</h2>
          <p>गोपनीयता संबंधी प्रश्नों के लिए, कृपया हमारे संपर्क पृष्ठ के माध्यम से लिखें।</p>
        </>
      ) : (
        <>
          <p>This policy explains how RajyaRank collects, uses, and protects your information.</p>

          <h2>1. What We Collect</h2>
          <ul>
            <li>Account information: name, mobile number, email, target exam.</li>
            <li>Usage data: lesson progress, test scores, study time — so we can personalise your study plan.</li>
            <li>Payment metadata: order and transaction IDs. We never store your card/bank details — that is handled directly by Razorpay.</li>
            <li>Communications: support tickets, contact form messages, and doubt submissions.</li>
          </ul>

          <h2>2. How We Use It</h2>
          <p>Your information is used to deliver the Service, track your progress, process payments, send essential notifications (OTP, exam alerts, payment receipts), and provide support. We do not sell your data to third parties for advertising.</p>

          <h2>3. Third-Party Services</h2>
          <p>We use Razorpay for payments, an SMS gateway for SMS/OTP, an SMTP provider for email, and cloud storage for files. These services only receive the data necessary for their function.</p>

          <h2>4. Cookies &amp; Sessions</h2>
          <p>We use essential session cookies to keep you signed in. We do not use third-party ad-tracking cookies.</p>

          <h2>5. Data Retention</h2>
          <p>We retain your data for as long as your account is active, or as required for legal/accounting purposes. You may request account deletion.</p>

          <h2>6. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your information — from your profile page, or via our Contact page.</p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>Data for users under 18 is collected only with a parent or guardian&apos;s consent.</p>

          <h2>8. Security</h2>
          <p>We use encryption, access controls, and regular security review to protect your data.</p>

          <h2>9. Contact</h2>
          <p>For privacy questions, please reach out via our Contact page.</p>
        </>
      )}
    </LegalPageLayout>
  );
}
