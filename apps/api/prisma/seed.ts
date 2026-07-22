/**
 * Idempotent seed. Reference data (states, exam bodies, exams, roles,
 * permissions) is always seeded. Demo users/assignments are seeded ONLY in
 * non-production, and never with real personal data.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { randomBytes, createCipheriv } from 'node:crypto';
import {
  PERMISSION_CODES,
  PERMISSION_CATEGORY,
  HIGH_RISK_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_KEYS,
  type RoleKey,
  type PermissionCode,
} from '@rajyarank/auth';

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';

function encryptSecret(plain: string): string {
  const keyRaw = process.env.FIELD_ENCRYPTION_KEY ?? 'dev-only-insecure-key-please-change-32b';
  const key = Buffer.from(keyRaw).subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

async function seedReference() {
  const bihar = await prisma.state.upsert({
    where: { code: 'BR' },
    update: {},
    create: { code: 'BR', nameEn: 'Bihar', nameHi: 'बिहार' },
  });
  const jharkhand = await prisma.state.upsert({
    where: { code: 'JH' },
    update: {},
    create: { code: 'JH', nameEn: 'Jharkhand', nameHi: 'झारखंड' },
  });

  // The platform is built to expand beyond Bihar/Jharkhand without rearchitecting
  // (State/Exam are just data) — seed the remaining Indian states now so the
  // onboarding/exam-selection dropdowns aren't hardcoded to only two states.
  // Exam bodies/exams for these are added separately as each state launches.
  const OTHER_STATES = [
    { code: 'AP', nameEn: 'Andhra Pradesh', nameHi: 'आंध्र प्रदेश' },
    { code: 'AR', nameEn: 'Arunachal Pradesh', nameHi: 'अरुणाचल प्रदेश' },
    { code: 'AS', nameEn: 'Assam', nameHi: 'असम' },
    { code: 'CG', nameEn: 'Chhattisgarh', nameHi: 'छत्तीसगढ़' },
    { code: 'GA', nameEn: 'Goa', nameHi: 'गोवा' },
    { code: 'GJ', nameEn: 'Gujarat', nameHi: 'गुजरात' },
    { code: 'HR', nameEn: 'Haryana', nameHi: 'हरियाणा' },
    { code: 'HP', nameEn: 'Himachal Pradesh', nameHi: 'हिमाचल प्रदेश' },
    { code: 'KA', nameEn: 'Karnataka', nameHi: 'कर्नाटक' },
    { code: 'KL', nameEn: 'Kerala', nameHi: 'केरल' },
    { code: 'MP', nameEn: 'Madhya Pradesh', nameHi: 'मध्य प्रदेश' },
    { code: 'MH', nameEn: 'Maharashtra', nameHi: 'महाराष्ट्र' },
    { code: 'MN', nameEn: 'Manipur', nameHi: 'मणिपुर' },
    { code: 'ML', nameEn: 'Meghalaya', nameHi: 'मेघालय' },
    { code: 'MZ', nameEn: 'Mizoram', nameHi: 'मिज़ोरम' },
    { code: 'NL', nameEn: 'Nagaland', nameHi: 'नागालैंड' },
    { code: 'OD', nameEn: 'Odisha', nameHi: 'ओडिशा' },
    { code: 'PB', nameEn: 'Punjab', nameHi: 'पंजाब' },
    { code: 'RJ', nameEn: 'Rajasthan', nameHi: 'राजस्थान' },
    { code: 'SK', nameEn: 'Sikkim', nameHi: 'सिक्किम' },
    { code: 'TN', nameEn: 'Tamil Nadu', nameHi: 'तमिलनाडु' },
    { code: 'TS', nameEn: 'Telangana', nameHi: 'तेलंगाना' },
    { code: 'TR', nameEn: 'Tripura', nameHi: 'त्रिपुरा' },
    { code: 'UP', nameEn: 'Uttar Pradesh', nameHi: 'उत्तर प्रदेश' },
    { code: 'UK', nameEn: 'Uttarakhand', nameHi: 'उत्तराखंड' },
    { code: 'WB', nameEn: 'West Bengal', nameHi: 'पश्चिम बंगाल' },
  ] as const;
  for (const s of OTHER_STATES) {
    await prisma.state.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  const bpsc = await prisma.examBody.upsert({
    where: { code: 'BPSC' },
    update: {},
    create: { code: 'BPSC', nameEn: 'Bihar Public Service Commission', nameHi: 'बिहार लोक सेवा आयोग' },
  });
  const jssc = await prisma.examBody.upsert({
    where: { code: 'JSSC' },
    update: {},
    create: { code: 'JSSC', nameEn: 'Jharkhand Staff Selection Commission', nameHi: 'झारखंड कर्मचारी चयन आयोग' },
  });

  // orgId is null (platform-seeded) for both — Prisma's compound-unique
  // findUnique/upsert can't take a literal null for a nullable key component,
  // so these use findFirst + create instead of upsert.
  let bpscPt = await prisma.exam.findFirst({ where: { code: 'BPSC_PT', orgId: null } });
  if (!bpscPt) {
    bpscPt = await prisma.exam.create({
      data: { code: 'BPSC_PT', nameEn: 'BPSC Prelims', nameHi: 'बीपीएससी प्रारंभिक', examBodyId: bpsc.id, stateId: bihar.id },
    });
  }
  let jsscCgl = await prisma.exam.findFirst({ where: { code: 'JSSC_CGL', orgId: null } });
  if (!jsscCgl) {
    jsscCgl = await prisma.exam.create({
      data: { code: 'JSSC_CGL', nameEn: 'JSSC CGL', nameHi: 'जेएसएससी सीजीएल', examBodyId: jssc.id, stateId: jharkhand.id },
    });
  }

  // Permissions
  for (const code of PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: { category: PERMISSION_CATEGORY[code], isHighRisk: HIGH_RISK_PERMISSIONS.has(code) },
      create: {
        code,
        category: PERMISSION_CATEGORY[code],
        isHighRisk: HIGH_RISK_PERMISSIONS.has(code as PermissionCode),
      },
    });
  }

  // Roles + role_permissions
  const roleNames: Record<RoleKey, string> = {
    STUDENT: 'Student',
    TEACHER: 'Teacher',
    QUESTION_SETTER: 'Question Setter',
    ACADEMIC_REVIEWER: 'Academic Reviewer',
    CONTENT_ADMIN: 'Content Admin',
    SUPPORT_AGENT: 'Support Agent',
    ACADEMIC_HEAD: 'Academic Head',
    SUPER_ADMIN: 'Super Admin',
  };
  for (const key of ROLE_KEYS) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: roleNames[key] },
      create: { key, name: roleNames[key] },
    });
    // ROLE_PERMISSIONS is only ever a bootstrap default for a brand-new role.
    // Once a role has any RolePermission rows, it's "live" — Super Admin's
    // Permission Matrix may have deliberately revoked one of these defaults,
    // and a re-seed (e.g. on every deploy) must never silently restore it.
    const alreadyInitialized = (await prisma.rolePermission.count({ where: { roleId: role.id } })) > 0;
    if (alreadyInitialized) continue;
    const codes = ROLE_PERMISSIONS[key];
    for (const code of codes) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  return { bihar, jharkhand, bpscPt, jsscCgl };
}

async function seedDemoUsers(ref: Awaited<ReturnType<typeof seedReference>>) {
  const password = await argon2.hash('RajyaRank@Dev1', { type: argon2.argon2id });

  async function makeStaff(email: string, name: string, roleKey: RoleKey, withMfa = false, phone?: string) {
    const user = await prisma.user.upsert({
      where: { id: `seed-${roleKey.toLowerCase()}` },
      update: phone ? { phone } : {},
      create: {
        id: `seed-${roleKey.toLowerCase()}`,
        kind: 'STAFF',
        status: 'ACTIVE',
        email,
        emailVerified: true,
        phone,
        passwordHash: password,
        displayName: name,
        mfaEnabled: withMfa,
        staffProfile: { create: { fullName: name, workEmail: email } },
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    if (withMfa) {
      const secret = authenticator.generateSecret();
      await prisma.mfaFactor.create({
        data: { userId: user.id, type: 'TOTP', status: 'ACTIVE', secretEnc: encryptSecret(secret), confirmedAt: new Date() },
      });
      console.log(`  ↳ ${email} TOTP secret (dev): ${secret}`);
    }
    return user;
  }

  const teacher = await makeStaff('teacher@rajyarank.dev', 'Ravi Kumar', 'TEACHER', false, '9876500011');
  await makeStaff('question-setter@rajyarank.dev', 'Suresh Yadav', 'QUESTION_SETTER', false, '9876500012');
  // MFA on: content.publish requires AAL2, and this role holds it.
  const reviewer = await makeStaff('reviewer@rajyarank.dev', 'Neha Singh', 'ACADEMIC_REVIEWER', true, '9876500013');
  const contentAdmin = await makeStaff('content-admin@rajyarank.dev', 'Amit Verma', 'CONTENT_ADMIN', false, '9876500014');
  await makeStaff('support@rajyarank.dev', 'Kavita Roy', 'SUPPORT_AGENT', false, '9876500015');
  await makeStaff('super-admin@rajyarank.dev', 'Priya Sinha', 'SUPER_ADMIN', true, '9876500016');

  // Scoped assignments: Teacher→EXAM, Reviewer→STATE.
  await upsertAssignment(teacher.id, 'EXAM', { stateId: ref.bihar.id, examId: ref.bpscPt.id });
  await upsertAssignment(reviewer.id, 'STATE', { stateId: ref.bihar.id });
  // Platform Content Admin operates platform-wide (all states/exams), not geo-locked:
  // a STATE assignment with no dimensions pinned covers every resource by the
  // engine's "broader assignment covers narrower" rule.
  await upsertAssignment(contentAdmin.id, 'STATE', {});

  // Demo institution (multi-tenant) + its head, org-scoped.
  // MFA on: content.publish requires AAL2, and this role holds it.
  const head = await makeStaff('head@greenvalley.dev', 'Dr. Meera Nair', 'ACADEMIC_HEAD', true, '9876500001');
  const org = await prisma.organization.upsert({
    where: { code: 'GREENVALLEY' },
    update: { headUserId: head.id, accessCode: 'GVDEMO2026' },
    create: { id: 'seed-org-greenvalley', name: 'Green Valley Institute', code: 'GREENVALLEY', accessCode: 'GVDEMO2026', headUserId: head.id, createdBy: 'seed' },
  });
  await prisma.user.update({ where: { id: head.id }, data: { orgId: org.id } });
  await upsertAssignment(head.id, 'ORG', { orgId: org.id });

  // A demo student (phone-verified) for e2e.
  const student = await prisma.user.upsert({
    where: { id: 'seed-student' },
    update: {},
    create: {
      id: 'seed-student',
      kind: 'STUDENT',
      status: 'ACTIVE',
      phone: '9876543210',
      phoneVerified: true,
      displayName: 'Demo Student',
      studentProfile: { create: { fullName: 'Demo Student', stateId: ref.bihar.id, targetExamId: ref.bpscPt.id } },
    },
  });
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { key: 'STUDENT' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: student.id, roleId: studentRole.id } },
    update: {},
    create: { userId: student.id, roleId: studentRole.id },
  });

  // A second demo student, enrolled in Green Valley Institute — demonstrates
  // the institute-price checkout path (the first demo student above stays
  // org-less to demonstrate the plain public-price path).
  const orgStudent = await prisma.user.upsert({
    where: { id: 'seed-student-greenvalley' },
    update: { orgId: org.id },
    create: {
      id: 'seed-student-greenvalley',
      kind: 'STUDENT',
      status: 'ACTIVE',
      phone: '9876500000',
      phoneVerified: true,
      displayName: 'Green Valley Student',
      orgId: org.id,
      studentProfile: { create: { fullName: 'Green Valley Student', stateId: ref.bihar.id, targetExamId: ref.bpscPt.id, onboardedAt: new Date() } },
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: orgStudent.id, roleId: studentRole.id } },
    update: {},
    create: { userId: orgStudent.id, roleId: studentRole.id },
  });
}

async function upsertAssignment(
  userId: string,
  scope: 'ORG' | 'STATE' | 'EXAM' | 'COURSE' | 'SUBJECT' | 'BATCH',
  dims: { orgId?: string; stateId?: string; examId?: string },
) {
  const existing = await prisma.staffAssignment.findFirst({
    where: { userId, scope, orgId: dims.orgId ?? null, stateId: dims.stateId ?? null, examId: dims.examId ?? null, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.staffAssignment.create({ data: { userId, scope, ...dims } });
}

async function seedDemoCourse(ref: Awaited<ReturnType<typeof seedReference>>) {
  const admin = await prisma.user.findUnique({ where: { id: 'seed-content_admin' } });
  const course = await prisma.course.upsert({
    where: { code: 'BPSC_PT_FULL' },
    update: {},
    create: {
      code: 'BPSC_PT_FULL',
      stateId: ref.bihar.id,
      examId: ref.bpscPt.id,
      titleHi: 'बीपीएससी प्रारंभिक — संपूर्ण कोर्स',
      titleEn: 'BPSC Prelims — Complete Course',
      descHi: 'सिलेबस, नोट्स, टेस्ट और डेली प्लान के साथ पूरी तैयारी।',
      descEn: 'Full preparation with syllabus, notes, tests and a daily plan.',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      createdBy: admin?.id,
    },
  });
  const subject = await prisma.subject.upsert({
    where: { id: 'seed-subject-polity' },
    update: {},
    create: { id: 'seed-subject-polity', courseId: course.id, nameHi: 'राजव्यवस्था', nameEn: 'Polity', sequence: 1 },
  });
  const chapter = await prisma.chapter.upsert({
    where: { id: 'seed-chapter-constitution' },
    update: {},
    create: { id: 'seed-chapter-constitution', subjectId: subject.id, nameHi: 'भारतीय संविधान', nameEn: 'Indian Constitution', sequence: 1 },
  });
  const topic = await prisma.topic.upsert({
    where: { id: 'seed-topic-fr' },
    update: {},
    create: { id: 'seed-topic-fr', chapterId: chapter.id, nameHi: 'मौलिक अधिकार', nameEn: 'Fundamental Rights', sequence: 1 },
  });
  const existingLesson = await prisma.lesson.findFirst({ where: { topicId: topic.id } });
  if (!existingLesson) {
    const lesson = await prisma.lesson.create({
      data: { topicId: topic.id, lessonType: 'VIDEO', freePreview: true, sequence: 1, createdBy: admin?.id ?? null },
    });
    const version = await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        versionNumber: 1,
        status: 'DRAFT',
        titleHi: 'मौलिक अधिकार — भाग 1',
        titleEn: 'Fundamental Rights — Part 1',
        createdBy: admin?.id ?? 'seed',
      },
    });
    await prisma.lesson.update({ where: { id: lesson.id }, data: { currentVersionId: version.id } });
  }
}

async function seedDemoCommerce() {
  const course = await prisma.course.findUnique({ where: { code: 'BPSC_PT_FULL' } });
  if (!course) return;
  await prisma.product.upsert({
    where: { id: 'seed-product-bpsc' },
    update: {},
    create: {
      id: 'seed-product-bpsc',
      kind: 'COURSE',
      courseId: course.id,
      titleHi: 'बीपीएससी प्रारंभिक — संपूर्ण कोर्स',
      titleEn: 'BPSC Prelims — Complete Course',
      priceMinor: 49900, // ₹499
      currency: 'INR',
      validityDays: 180,
      accessType: 'PAID',
      active: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', type: 'PERCENT', value: 10, perUserLimit: 1, active: true },
  });
}

/** An institute-owned, dual-priced course — demonstrates "Public + Institute"
 *  audience: sold on the public marketplace at one price, and at a lower price
 *  to Green Valley's own enrolled students. */
async function seedInstituteCourse(ref: Awaited<ReturnType<typeof seedReference>>) {
  const org = await prisma.organization.findUnique({ where: { code: 'GREENVALLEY' } });
  const head = await prisma.user.findUnique({ where: { id: 'seed-academic_head' } });
  if (!org) return;
  const course = await prisma.course.upsert({
    where: { code: 'GV_JSSC_CGL' },
    update: {},
    create: {
      code: 'GV_JSSC_CGL',
      stateId: ref.jharkhand.id,
      examId: ref.jsscCgl.id,
      titleHi: 'जेएसएससी सीजीएल — संपूर्ण कोर्स',
      titleEn: 'JSSC CGL — Complete Course',
      descHi: 'ग्रीन वैली इंस्टिट्यूट द्वारा — वीडियो, नोट्स और टेस्ट के साथ।',
      descEn: 'By Green Valley Institute — with videos, notes and tests.',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      orgId: org.id,
      createdBy: head?.id,
    },
  });
  await prisma.product.upsert({
    where: { id: 'seed-product-gv-public' },
    update: {},
    create: {
      id: 'seed-product-gv-public',
      kind: 'COURSE',
      courseId: course.id,
      audience: 'PUBLIC',
      titleHi: course.titleHi,
      titleEn: course.titleEn,
      priceMinor: 79900, // ₹799
      currency: 'INR',
      validityDays: 180,
      accessType: 'PAID',
      active: true,
    },
  });
  await prisma.product.upsert({
    where: { id: 'seed-product-gv-institute' },
    update: {},
    create: {
      id: 'seed-product-gv-institute',
      kind: 'COURSE',
      courseId: course.id,
      audience: 'INSTITUTE',
      titleHi: course.titleHi,
      titleEn: course.titleEn,
      priceMinor: 39900, // ₹399 — Green Valley's own students pay less
      currency: 'INR',
      validityDays: 180,
      accessType: 'PAID',
      active: true,
    },
  });
}

/** Real marketing copy — seeded in every environment (not demo-only), so the
 *  homepage's Testimonials/FAQ/Study Content sections always have content
 *  even before an admin has edited anything via /admin/marketing. */
async function seedMarketingContent() {
  const testimonials = [
    { id: 'seed-testimonial-1', quoteHi: 'डेली प्लान से पता चलता है कि आज क्या पढ़ना है। पहले बहुत सारे वीडियो देखकर confuse हो जाता था।', quoteEn: 'The daily plan tells me exactly what to study. Earlier I got confused by too many videos.', studentName: 'Ankit Kumar', initials: 'AK', examLabel: 'SSC CGL', sequence: 0 },
    { id: 'seed-testimonial-2', quoteHi: 'हर टेस्ट के बाद गलत टॉपिक की लिस्ट मिलती है। इससे रिवीज़न बहुत आसान हो गया।', quoteEn: 'After every test I get a weak-topic list — revision became much easier.', studentName: 'Priya Sinha', initials: 'PS', examLabel: 'BSSC', sequence: 1 },
    { id: 'seed-testimonial-3', quoteHi: 'हिंदी explanation सरल है और मोबाइल पर वेबसाइट तेज़ चलती है। कम network में भी useful है।', quoteEn: 'Hindi explanations are simple and the site is fast on mobile — useful even on low network.', studentName: 'Manoj Rana', initials: 'MR', examLabel: 'JSSC', sequence: 2 },
  ];
  for (const t of testimonials) {
    await prisma.testimonial.upsert({ where: { id: t.id }, update: t, create: t });
  }

  const faqs = [
    { id: 'seed-faq-1', questionHi: 'क्या बिना भुगतान कोर्स देख सकते हैं?', questionEn: 'Can I explore without paying?', answerHi: 'हाँ — सिलेबस, डेमो वीडियो और दैनिक क्विज़ मुफ़्त हैं। पूरा कंटेंट खरीद के बाद अनलॉक होता है।', answerEn: 'Yes — syllabus, demo videos and the daily quiz are free. Full content unlocks after purchase.', sequence: 0 },
    { id: 'seed-faq-2', questionHi: 'कोर्स की वैधता कितनी होगी?', questionEn: 'How long is course validity?', answerHi: 'हर कोर्स पर वैधता स्पष्ट दिखाई जाती है — परीक्षा-चक्र, 4-माह, 6-माह और 8-माह प्लान उपलब्ध हैं।', answerEn: 'Validity is shown clearly on each course — exam-cycle, 4-month, 6-month and 8-month plans are available.', sequence: 1 },
    { id: 'seed-faq-3', questionHi: 'क्या प्रश्न हिंदी और अंग्रेज़ी दोनों में हैं?', questionEn: 'Are questions bilingual?', answerHi: 'हाँ। इंटरफ़ेस और प्रश्न दोनों भाषाओं में उपलब्ध हैं।', answerEn: 'Yes. Both the interface and questions are available in Hindi and English.', sequence: 2 },
    { id: 'seed-faq-4', questionHi: 'भुगतान के बाद कोर्स कब खुलता है?', questionEn: 'When does access unlock after payment?', answerHi: 'बैकएंड भुगतान सत्यापित करके entitlement बनाता है, फिर तुरंत एक्सेस मिलता है।', answerEn: 'The backend verifies the payment and creates your entitlement — access is immediate.', sequence: 3 },
  ];
  for (const f of faqs) {
    await prisma.faq.upsert({ where: { id: f.id }, update: f, create: f });
  }

  const teasers = [
    { id: 'seed-teaser-video', kind: 'VIDEO' as const, titleHi: 'मौलिक अधिकार — पूर्ण', titleEn: 'Fundamental Rights — Complete', descHi: '45 मिनट की द्विभाषी कक्षा, सारांश और अभ्यास सहित।', descEn: '45-minute bilingual lesson with summary and practice.', sequence: 0 },
    { id: 'seed-teaser-pdf', kind: 'PDF' as const, titleHi: 'बिहार करेंट अफेयर्स — जुलाई', titleEn: 'Bihar Current Affairs — July', descHi: '120 पृष्ठों का संग्रह, महत्वपूर्ण तथ्यों और MCQ के साथ।', descEn: '120-page compilation with important facts and MCQs.', sequence: 1 },
    { id: 'seed-teaser-test', kind: 'TEST' as const, titleHi: 'प्रतिशत निदान परीक्षण', titleEn: 'Percentage Diagnostic Test', descHi: '20 प्रश्न, स्पष्टीकरण और विस्तृत विश्लेषण के साथ।', descEn: '20 questions, explanations and detailed analytics.', sequence: 2 },
    { id: 'seed-teaser-pack', kind: 'PACK' as const, titleHi: 'भारतीय राजव्यवस्था रिवीज़न पैक', titleEn: 'Indian Polity Revision Pack', descHi: '5 वीडियो, 4 PDF, फ़्लैशकार्ड और 3 टेस्ट।', descEn: '5 videos, 4 PDFs, flashcards and 3 tests.', sequence: 3 },
  ];
  for (const t of teasers) {
    await prisma.studyContentTeaser.upsert({ where: { id: t.id }, update: t, create: t });
  }
}

/** Institution subscription plan catalog — real platform pricing, seeded in
 *  every environment (not demo-only), matching the Starter/Growth/Pro tiers
 *  from the profit-model prototype. */
async function seedBillingPlans() {
  const plans = [
    { code: 'STARTER', nameHi: 'स्टार्टर', nameEn: 'Starter', priceMonthlyMinor: 299900, priceAnnualMinor: 299900 * 10, maxActiveStudents: 250, maxStaffSeats: 5, storageGb: 50, internalFeeBps: 300, externalFeeBps: 1800, sequence: 0 },
    { code: 'GROWTH', nameHi: 'ग्रोथ', nameEn: 'Growth', priceMonthlyMinor: 799900, priceAnnualMinor: 799900 * 10, maxActiveStudents: 1500, maxStaffSeats: 20, storageGb: 250, internalFeeBps: 150, externalFeeBps: 1500, sequence: 1 },
    { code: 'PRO', nameHi: 'प्रो', nameEn: 'Pro', priceMonthlyMinor: 1499900, priceAnnualMinor: 1499900 * 10, maxActiveStudents: 5000, maxStaffSeats: 200, storageGb: 1000, internalFeeBps: 50, externalFeeBps: 1200, sequence: 2 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { code: p.code }, update: p, create: p });
  }
}

/** Demo institution subscription (non-production) so the billing admin pages
 *  have something real to show without manual setup. */
async function seedDemoSubscription() {
  const org = await prisma.organization.findUnique({ where: { code: 'GREENVALLEY' } });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: 'GROWTH' } });
  if (!org || !plan) return;
  const existing = await prisma.organizationSubscription.findUnique({ where: { orgId: org.id } });
  if (existing) return;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const subscription = await prisma.organizationSubscription.create({
    data: {
      orgId: org.id,
      planId: plan.id,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      razorpaySubscriptionId: 'sub_dev_seed_greenvalley',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
  await prisma.institutionInvoice.create({
    data: {
      invoiceNumber: `INV-RR-${now.toISOString().slice(2, 10).replace(/-/g, '')}-SEED`,
      subscriptionId: subscription.id,
      periodLabel: now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      basePlanMinor: plan.priceMonthlyMinor,
      totalMinor: plan.priceMonthlyMinor,
      status: 'PAID',
      dueAt: now,
      paidAt: now,
    },
  });
}

/** Demo institute linked account (non-production), KYC-verified so the
 *  Green Valley org's course sales split and settle end-to-end without
 *  manual admin setup. */
async function seedDemoLinkedAccount() {
  const org = await prisma.organization.findUnique({ where: { code: 'GREENVALLEY' } });
  if (!org) return;
  await prisma.instituteLinkedAccount.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      razorpayAccountId: 'acc_dev_seed_greenvalley',
      kycStatus: 'VERIFIED',
      payoutsEnabled: true,
    },
  });
}

async function main() {
  console.log('Seeding reference data…');
  const ref = await seedReference();
  console.log('Seeding marketing content (testimonials, FAQs, study-content teasers)…');
  await seedMarketingContent();
  console.log('Seeding institution subscription plan catalog…');
  await seedBillingPlans();
  if (!isProd) {
    console.log('Seeding demo users (non-production)…');
    await seedDemoUsers(ref);
    console.log('Seeding demo course hierarchy (non-production)…');
    await seedDemoCourse(ref);
    console.log('Seeding demo product + coupon (non-production)…');
    await seedDemoCommerce();
    console.log('Seeding institute dual-priced demo course (non-production)…');
    await seedInstituteCourse(ref);
    console.log('Seeding demo institution subscription (non-production)…');
    await seedDemoSubscription();
    console.log('Seeding demo institute linked account (non-production)…');
    await seedDemoLinkedAccount();
  } else {
    console.log('Production seed: reference data only (no demo users).');
  }
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
