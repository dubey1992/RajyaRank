import { resolveLocale } from '@/lib/i18n';
import { LegalPageLayout } from '@/components/LegalPageLayout';

export const dynamic = 'force-static';

export default function TermsPage({ params }: { params: { locale: string } }) {
  const locale = resolveLocale(params.locale);
  const hi = locale === 'hi';

  return (
    <LegalPageLayout locale={locale} titleHi="सेवा की शर्तें" titleEn="Terms of Service" updatedOn="20 July 2026">
      {hi ? (
        <>
          <p>ये शर्तें RajyaRank (&quot;हम&quot;, &quot;हमारा&quot;) द्वारा प्रदान किए जाने वाले वेबसाइट, ऐप और सेवाओं (सामूहिक रूप से &quot;सेवा&quot;) के उपयोग को नियंत्रित करती हैं। सेवा का उपयोग करके, आप इन शर्तों से सहमत होते हैं।</p>

          <h2>1. खाता और पात्रता</h2>
          <p>सेवा का उपयोग करने के लिए एक वैध मोबाइल नंबर या ईमेल से खाता बनाना आवश्यक है। 18 वर्ष से कम आयु के उपयोगकर्ताओं को अभिभावक की सहमति से खाता बनाना चाहिए। आप अपने खाते की सुरक्षा और उससे होने वाली सभी गतिविधियों के लिए ज़िम्मेदार हैं।</p>

          <h2>2. कोर्स, टेस्ट सीरीज़ और सदस्यता योजनाएँ</h2>
          <p>सेवा पर सामग्री तीन तरीकों से उपलब्ध कराई जाती है: निःशुल्क पूर्वावलोकन पाठ, व्यक्तिगत कोर्स/टेस्ट सीरीज़ की सीधी खरीद, और समय-सीमित सदस्यता योजनाएँ (Plus/Pro)। खरीदी गई पहुँच केवल आपके व्यक्तिगत, गैर-हस्तांतरणीय उपयोग के लिए है और निर्दिष्ट वैधता अवधि तक सीमित है।</p>

          <h2>3. भुगतान</h2>
          <p>सभी भुगतान Razorpay के माध्यम से सुरक्षित रूप से संसाधित किए जाते हैं। हम आपके कार्ड या बैंक विवरण संग्रहीत नहीं करते। कीमतें भारतीय रुपये (₹) में हैं और लागू करों सहित हो सकती हैं।</p>

          <h2>4. सामग्री का उपयोग</h2>
          <p>वीडियो, नोट्स और टेस्ट सामग्री कॉपीराइट-सुरक्षित हैं और केवल स्ट्रीमिंग/व्यू के लिए उपलब्ध कराई जाती हैं। सामग्री की रिकॉर्डिंग, डाउनलोडिंग (जहाँ स्पष्ट रूप से अनुमत न हो), पुनर्वितरण, या साझा लॉगिन का उपयोग सख्त वर्जित है और खाता निलंबन का कारण बन सकता है।</p>

          <h2>5. आचरण</h2>
          <p>आप सेवा का उपयोग किसी भी अवैध उद्देश्य के लिए, किसी अन्य उपयोगकर्ता को परेशान करने के लिए, या सिस्टम की सुरक्षा को दरकिनार करने का प्रयास करने के लिए नहीं करेंगे।</p>

          <h2>6. समाप्ति</h2>
          <p>हम इन शर्तों के उल्लंघन की स्थिति में किसी भी खाते को निलंबित या समाप्त कर सकते हैं, बिना पूर्व सूचना के गंभीर मामलों में।</p>

          <h2>7. दायित्व की सीमा</h2>
          <p>सेवा &quot;जैसी है&quot; प्रदान की जाती है। हम परीक्षा परिणामों, सामग्री की पूर्णता, या निर्बाध उपलब्धता की गारंटी नहीं देते। कानून द्वारा अनुमत सीमा तक, हम अप्रत्यक्ष या परिणामी क्षति के लिए उत्तरदायी नहीं होंगे।</p>

          <h2>8. शर्तों में बदलाव</h2>
          <p>हम इन शर्तों को समय-समय पर अपडेट कर सकते हैं। महत्वपूर्ण बदलावों की सूचना सेवा के भीतर या ईमेल द्वारा दी जाएगी।</p>

          <h2>9. शासी कानून</h2>
          <p>ये शर्तें भारत के कानूनों के अनुसार शासित हैं।</p>

          <h2>10. संपर्क</h2>
          <p>इन शर्तों से संबंधित प्रश्नों के लिए, कृपया हमारे संपर्क पृष्ठ के माध्यम से लिखें।</p>
        </>
      ) : (
        <>
          <p>These terms govern your use of the website, app, and services provided by RajyaRank (&quot;we&quot;, &quot;our&quot;), collectively the &quot;Service&quot;. By using the Service, you agree to these terms.</p>

          <h2>1. Account &amp; Eligibility</h2>
          <p>Using the Service requires a verified mobile number or email. Users under 18 must have a parent or guardian&apos;s consent to create an account. You are responsible for the security of your account and all activity under it.</p>

          <h2>2. Courses, Test Series &amp; Subscription Plans</h2>
          <p>Content is made available three ways: free preview lessons, direct purchase of an individual course or test series, and time-bound subscription plans (Plus/Pro). Access you purchase is for your personal, non-transferable use only and is limited to the stated validity period.</p>

          <h2>3. Payments</h2>
          <p>All payments are processed securely through Razorpay. We do not store your card or bank details. Prices are in Indian Rupees (₹) and may be inclusive of applicable taxes.</p>

          <h2>4. Use of Content</h2>
          <p>Videos, notes, and test material are copyright-protected and made available for streaming/viewing only. Recording, downloading (unless explicitly permitted), redistributing content, or sharing your login is strictly prohibited and may result in account suspension.</p>

          <h2>5. Conduct</h2>
          <p>You will not use the Service for any unlawful purpose, to harass another user, or to attempt to circumvent the platform&apos;s security.</p>

          <h2>6. Termination</h2>
          <p>We may suspend or terminate any account that violates these terms, without prior notice in serious cases.</p>

          <h2>7. Limitation of Liability</h2>
          <p>The Service is provided &quot;as is&quot;. We do not guarantee exam outcomes, completeness of content, or uninterrupted availability. To the extent permitted by law, we are not liable for indirect or consequential damages.</p>

          <h2>8. Changes to These Terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated within the Service or by email.</p>

          <h2>9. Governing Law</h2>
          <p>These terms are governed by the laws of India.</p>

          <h2>10. Contact</h2>
          <p>For questions about these terms, please reach out via our Contact page.</p>
        </>
      )}
    </LegalPageLayout>
  );
}
