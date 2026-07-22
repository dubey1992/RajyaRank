import type { Locale } from './i18n';

type Bi = { hi: string; en: string };
const pick = (b: Bi, locale: Locale) => (locale === 'hi' ? b.hi : b.en);

/** Title-case a dotted/underscored code as a readable fallback. */
function humanize(code: string): string {
  return code
    .replace(/[._]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ── Roles ────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, Bi> = {
  STUDENT: { hi: 'छात्र', en: 'Student' },
  TEACHER: { hi: 'शिक्षक', en: 'Teacher' },
  QUESTION_SETTER: { hi: 'प्रश्न-सेटर', en: 'Question Setter' },
  ACADEMIC_REVIEWER: { hi: 'समीक्षक', en: 'Academic Reviewer' },
  CONTENT_ADMIN: { hi: 'कंटेंट एडमिन', en: 'Content Admin' },
  SUPPORT_AGENT: { hi: 'सहायता एजेंट', en: 'Support Agent' },
  SUPER_ADMIN: { hi: 'सुपर एडमिन', en: 'Super Admin' },
  ACADEMIC_HEAD: { hi: 'शैक्षणिक प्रमुख', en: 'Academic Head' },
};
export function roleLabel(key: string, locale: Locale): string {
  const b = ROLE_LABELS[key];
  return b ? pick(b, locale) : humanize(key);
}

// ── Permissions (label + one-line description) ────────────────────────────────
const PERMISSION_LABELS: Record<string, { label: Bi; desc: Bi }> = {
  'content.create': { label: { hi: 'कंटेंट बनाना', en: 'Create content' }, desc: { hi: 'नए पाठ/ड्राफ़्ट बनाना', en: 'Create new lessons/drafts' } },
  'content.edit_own': { label: { hi: 'अपना कंटेंट संपादित', en: 'Edit own content' }, desc: { hi: 'स्वयं बनाया कंटेंट संपादित करना', en: 'Edit content you created' } },
  'content.edit_all': { label: { hi: 'सभी कंटेंट संपादित', en: 'Edit all content' }, desc: { hi: 'किसी का भी कंटेंट संपादित करना', en: "Edit anyone's content" } },
  'content.submit_review': { label: { hi: 'समीक्षा हेतु भेजना', en: 'Submit for review' }, desc: { hi: 'ड्राफ़्ट समीक्षा हेतु भेजना', en: 'Send drafts to review' } },
  'content.review': { label: { hi: 'कंटेंट समीक्षा', en: 'Review content' }, desc: { hi: 'समीक्षा शुरू/टिप्पणी/सुधार', en: 'Start review, comment, request changes' } },
  'content.approve': { label: { hi: 'कंटेंट अनुमोदन', en: 'Approve content' }, desc: { hi: 'अनुमोदन/अस्वीकृति', en: 'Approve or reject content' } },
  'content.publish': { label: { hi: 'कंटेंट प्रकाशन', en: 'Publish content' }, desc: { hi: 'प्रकाशित/शेड्यूल करना', en: 'Publish or schedule content' } },
  'content.unpublish': { label: { hi: 'प्रकाशन हटाना', en: 'Unpublish content' }, desc: { hi: 'प्रकाशित कंटेंट हटाना', en: 'Take published content down' } },
  'content.archive': { label: { hi: 'कंटेंट संग्रह', en: 'Archive content' }, desc: { hi: 'कंटेंट संग्रहित करना', en: 'Archive content' } },
  'course.manage': { label: { hi: 'कोर्स प्रबंधन', en: 'Manage courses' }, desc: { hi: 'कोर्स संरचना बनाना/संपादित करना', en: 'Create & edit the course hierarchy' } },
  'question.create': { label: { hi: 'प्रश्न बनाना', en: 'Create questions' }, desc: { hi: 'प्रश्न बैंक में जोड़ना', en: 'Add to the question bank' } },
  'question.import': { label: { hi: 'प्रश्न आयात', en: 'Import questions' }, desc: { hi: 'CSV बल्क-इम्पोर्ट', en: 'Bulk CSV import' } },
  'test.create': { label: { hi: 'टेस्ट बनाना', en: 'Create tests' }, desc: { hi: 'टेस्ट व सेक्शन बनाना', en: 'Build tests & sections' } },
  'assignment.manage': { label: { hi: 'असाइनमेंट प्रबंधन', en: 'Manage assignments' }, desc: { hi: 'स्टाफ़ का स्कोप तय करना', en: 'Set staff scope' } },
  'user.invite': { label: { hi: 'स्टाफ़ आमंत्रण', en: 'Invite staff' }, desc: { hi: 'नए स्टाफ़ को आमंत्रित करना', en: 'Invite new staff' } },
  'user.manage': { label: { hi: 'स्टाफ़ प्रबंधन', en: 'Manage staff' }, desc: { hi: 'स्टाफ़ खाते देखना/प्रबंधित करना', en: 'View & manage staff accounts' } },
  'user.disable': { label: { hi: 'खाता निष्क्रिय', en: 'Disable accounts' }, desc: { hi: 'स्थिति बदलना/निष्क्रिय करना', en: 'Change status / disable' } },
  'role.manage': { label: { hi: 'भूमिका प्रबंधन', en: 'Manage roles' }, desc: { hi: 'भूमिकाएँ व अनुमतियाँ', en: 'Roles & permissions' } },
  'audit.view': { label: { hi: 'ऑडिट देखना', en: 'View audit log' }, desc: { hi: 'सुरक्षा/गतिविधि लॉग', en: 'Security/activity log' } },
  'support.manage': { label: { hi: 'सहायता प्रबंधन', en: 'Manage support' }, desc: { hi: 'सहायता टिकट संभालना', en: 'Handle support tickets' } },
  'payment.status_view': { label: { hi: 'भुगतान स्थिति', en: 'View payments' }, desc: { hi: 'भुगतान स्थिति देखना', en: 'View payment status' } },
  'payment.manage': { label: { hi: 'भुगतान प्रबंधन', en: 'Manage payments' }, desc: { hi: 'रिफ़ंड/भुगतान प्रबंधन', en: 'Refunds & payment ops' } },
  'doubt.respond': { label: { hi: 'शंका उत्तर', en: 'Answer doubts' }, desc: { hi: 'छात्रों की शंकाओं का उत्तर', en: 'Respond to student doubts' } },
  'org.manage': { label: { hi: 'संस्थान प्रबंधन', en: 'Manage institutions' }, desc: { hi: 'संस्थान, योजनाएँ व निपटान', en: 'Institutions, plans & settlements' } },
  'marketing.manage': { label: { hi: 'मार्केटिंग सामग्री', en: 'Manage marketing content' }, desc: { hi: 'टेस्टिमोनियल, FAQ व अध्ययन सामग्री टीज़र', en: 'Testimonials, FAQs & study-content teasers' } },
};
export function permissionLabel(code: string, locale: Locale): string {
  const p = PERMISSION_LABELS[code];
  return p ? pick(p.label, locale) : humanize(code);
}
export function permissionDesc(code: string, locale: Locale): string | undefined {
  const p = PERMISSION_LABELS[code];
  return p ? pick(p.desc, locale) : undefined;
}

// ── Audit actions ─────────────────────────────────────────────────────────────
const AUDIT_LABELS: Record<string, Bi> = {
  'auth.login': { hi: 'लॉगिन', en: 'Signed in' },
  'auth.login.google': { hi: 'Google से लॉगिन', en: 'Signed in with Google' },
  'auth.login.mfa_required': { hi: 'MFA आवश्यक', en: 'MFA required at sign-in' },
  'auth.login.mfa_skipped_dev': { hi: 'MFA छोड़ा गया (परीक्षण)', en: 'MFA skipped (testing)' },
  'auth.mfa': { hi: 'MFA सत्यापित', en: 'MFA verified' },
  'auth.password_reset': { hi: 'पासवर्ड रीसेट', en: 'Password reset' },
  'auth.refresh.reuse': { hi: 'टोकन पुन:उपयोग पहचान', en: 'Token reuse detected' },
  'asset.upload_complete': { hi: 'अपलोड पूर्ण', en: 'Upload completed' },
  'asset.quarantined': { hi: 'फ़ाइल क्वारंटीन', en: 'File quarantined' },
  'content.published': { hi: 'कंटेंट प्रकाशित', en: 'Content published' },
  'course.create': { hi: 'कोर्स बनाया', en: 'Course created' },
  'course.update': { hi: 'कोर्स अपडेट', en: 'Course updated' },
  'lesson.create': { hi: 'पाठ बनाया', en: 'Lesson created' },
  'question.create': { hi: 'प्रश्न बनाया', en: 'Question created' },
  'question.import': { hi: 'प्रश्न आयात', en: 'Questions imported' },
  'question.approved': { hi: 'प्रश्न अनुमोदित', en: 'Question approved' },
  'staff.invite': { hi: 'स्टाफ़ आमंत्रित', en: 'Staff invited' },
  'staff.invite.accept': { hi: 'आमंत्रण स्वीकृत', en: 'Invitation accepted' },
  'staff.invite.resend': { hi: 'आमंत्रण पुनः भेजा', en: 'Invitation resent' },
  'staff.invite.revoke': { hi: 'आमंत्रण रद्द', en: 'Invitation revoked' },
  'staff.assignment_change': { hi: 'असाइनमेंट बदला', en: 'Assignments changed' },
  'staff.status_change': { hi: 'स्टाफ़ स्थिति बदली', en: 'Staff status changed' },
  'staff.force_password_reset': { hi: 'पासवर्ड रीसेट अनिवार्य', en: 'Forced password reset' },
  'staff.revoke_sessions': { hi: 'सत्र रद्द', en: 'Sessions revoked' },
  'order.created': { hi: 'ऑर्डर बनाया', en: 'Order created' },
  'payment.paid': { hi: 'भुगतान सफल', en: 'Payment received' },
  'payment.refunded': { hi: 'रिफ़ंड', en: 'Payment refunded' },
  'entitlement.granted': { hi: 'एक्सेस दिया', en: 'Access granted' },
  'entitlement.revoked': { hi: 'एक्सेस हटाया', en: 'Access revoked' },
};
export function auditLabel(action: string, locale: Locale): string {
  const b = AUDIT_LABELS[action];
  return b ? pick(b, locale) : humanize(action);
}

const RESULT_LABELS: Record<string, Bi> = {
  SUCCESS: { hi: 'सफल', en: 'Success' },
  DENIED: { hi: 'अस्वीकृत', en: 'Denied' },
  FAILED: { hi: 'विफल', en: 'Failed' },
};
export function resultLabel(result: string, locale: Locale): string {
  const b = RESULT_LABELS[result];
  return b ? pick(b, locale) : result;
}
