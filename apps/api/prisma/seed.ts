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
  // Not a real state — the "I'm preparing for a national exam, not a
  // state-specific one" option in the State dropdown (Set Goal / onboarding).
  // Exams.stateId is nullable specifically for national-level exams (SSC,
  // Railways, Banking, UPSC, etc — currently ~32 of 67 seeded exams); the
  // frontend matches on this row's code, not its id, to filter to those.
  await prisma.state.upsert({
    where: { code: 'ALL_INDIA' },
    update: {},
    create: { code: 'ALL_INDIA', nameEn: 'All India', nameHi: 'अखिल भारत' },
  });

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
  const otherStateRows: Record<string, Awaited<ReturnType<typeof prisma.state.upsert>>> = {};
  for (const s of OTHER_STATES) {
    otherStateRows[s.code] = await prisma.state.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // ── Exam bodies + exams — real, permanent reference data (unlike the demo
  // users/courses seeded below, this is never !isProd-gated). GET /exams and
  // GET /admin/catalogue/exams both read straight from this table, so it's
  // the platform's actual exam catalog, not sample data. Institutions can
  // still add their own on top of this baseline via POST /admin/catalogue/exams. ──

  // Exam.code is unique per (orgId, code), not globally — Prisma's
  // compound-unique upsert can't target a literal null orgId, so this does
  // its own find-then-update-or-create. Also means a later correction to a
  // name below actually reaches the already-seeded row on the next re-run,
  // unlike a bare create-if-missing.
  async function upsertExam(code: string, nameEn: string, nameHi: string, examBodyId: string, stateId: string | null) {
    const existing = await prisma.exam.findFirst({ where: { code, orgId: null } });
    if (existing) return prisma.exam.update({ where: { id: existing.id }, data: { nameEn, nameHi, examBodyId, stateId } });
    return prisma.exam.create({ data: { code, nameEn, nameHi, examBodyId, stateId } });
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
  const bpssc = await prisma.examBody.upsert({
    where: { code: 'BPSSC' },
    update: {},
    create: { code: 'BPSSC', nameEn: 'Bihar Police Subordinate Services Commission', nameHi: 'बिहार पुलिस अधीनस्थ सेवा चयन आयोग' },
  });
  const bseb = await prisma.examBody.upsert({
    where: { code: 'BSEB' },
    update: {},
    create: { code: 'BSEB', nameEn: 'Bihar School Examination Board', nameHi: 'बिहार विद्यालय परीक्षा समिति' },
  });

  // Bihar/Jharkhand depth — replaces the old dev-only BPSC_PT/JSSC_CGL
  // placeholders (fully removed from prod; see remove-default-exams.js) with
  // real, permanent exams under the same and related commissions.
  const bpscCce = await upsertExam('BPSC_CCE', 'Combined Competitive Examination (CCE)', 'संयुक्त प्रतियोगिता परीक्षा (सीसीई)', bpsc.id, bihar.id);
  await upsertExam('BPSC_JUDICIAL', 'Judicial Services Examination', 'न्यायिक सेवा परीक्षा', bpsc.id, bihar.id);
  await upsertExam('BPSC_TRE', 'Teacher Recruitment Examination (TRE)', 'शिक्षक भर्ती परीक्षा (टीआरई)', bpsc.id, bihar.id);
  await upsertExam('BPSSC_SI', 'Bihar Police Sub-Inspector Examination', 'बिहार पुलिस उप-निरीक्षक परीक्षा', bpssc.id, bihar.id);
  await upsertExam('BSEB_STET', 'Bihar STET', 'बिहार एसटीईटी', bseb.id, bihar.id);
  const jsscCgl = await upsertExam('JSSC_CGL', 'Combined Graduate Level (CGL)', 'संयुक्त स्नातक स्तरीय (सीजीएल)', jssc.id, jharkhand.id);
  await upsertExam('JSSC_EXCISE', 'Excise Constable Examination', 'उत्पाद सिपाही परीक्षा', jssc.id, jharkhand.id);
  await upsertExam('JSSC_ILCCE', 'Intermediate-Level Combined Competitive Examination', 'इंटरमीडिएट स्तरीय संयुक्त प्रतियोगिता परीक्षा', jssc.id, jharkhand.id);

  // Central/all-India bodies — stateId null (relevant nationwide).
  const CENTRAL_BODIES = [
    { code: 'UPSC', nameEn: 'Union Public Service Commission', nameHi: 'संघ लोक सेवा आयोग' },
    { code: 'SSC', nameEn: 'Staff Selection Commission', nameHi: 'कर्मचारी चयन आयोग' },
    { code: 'IBPS', nameEn: 'Institute of Banking Personnel Selection', nameHi: 'बैंकिंग कार्मिक चयन संस्थान' },
    { code: 'SBI', nameEn: 'State Bank of India', nameHi: 'भारतीय स्टेट बैंक' },
    { code: 'RBI', nameEn: 'Reserve Bank of India', nameHi: 'भारतीय रिज़र्व बैंक' },
    { code: 'RRB', nameEn: 'Railway Recruitment Board', nameHi: 'रेलवे भर्ती बोर्ड' },
    { code: 'ARMED_FORCES', nameEn: 'Indian Armed Forces', nameHi: 'भारतीय सशस्त्र सेना' },
    { code: 'CBSE', nameEn: 'Central Board of Secondary Education', nameHi: 'केंद्रीय माध्यमिक शिक्षा बोर्ड' },
    { code: 'UGC', nameEn: 'University Grants Commission', nameHi: 'विश्वविद्यालय अनुदान आयोग' },
    { code: 'LIC', nameEn: 'Life Insurance Corporation of India', nameHi: 'भारतीय जीवन बीमा निगम' },
  ] as const;
  const centralBodyRows: Record<string, Awaited<ReturnType<typeof prisma.examBody.upsert>>> = {};
  for (const b of CENTRAL_BODIES) {
    centralBodyRows[b.code] = await prisma.examBody.upsert({ where: { code: b.code }, update: {}, create: b });
  }

  const CENTRAL_EXAMS = [
    { code: 'UPSC_CSE', body: 'UPSC', nameEn: 'Civil Services Examination (CSE)', nameHi: 'सिविल सेवा परीक्षा' },
    { code: 'UPSC_NDA', body: 'UPSC', nameEn: 'National Defence Academy (NDA) Examination', nameHi: 'राष्ट्रीय रक्षा अकादमी (एनडीए) परीक्षा' },
    { code: 'UPSC_CDS', body: 'UPSC', nameEn: 'Combined Defence Services (CDS) Examination', nameHi: 'संयुक्त रक्षा सेवा (सीडीएस) परीक्षा' },
    { code: 'UPSC_CAPF', body: 'UPSC', nameEn: 'Central Armed Police Forces (CAPF) Examination', nameHi: 'केंद्रीय सशस्त्र पुलिस बल (सीएपीएफ) परीक्षा' },
    { code: 'UPSC_ESE', body: 'UPSC', nameEn: 'Engineering Services Examination (ESE)', nameHi: 'इंजीनियरिंग सेवा परीक्षा' },
    { code: 'SSC_CGL', body: 'SSC', nameEn: 'Combined Graduate Level (CGL)', nameHi: 'संयुक्त स्नातक स्तरीय (सीजीएल)' },
    { code: 'SSC_CHSL', body: 'SSC', nameEn: 'Combined Higher Secondary Level (CHSL)', nameHi: 'संयुक्त उच्चतर माध्यमिक स्तरीय (सीएचएसएल)' },
    { code: 'SSC_MTS', body: 'SSC', nameEn: 'Multi-Tasking Staff (MTS) Examination', nameHi: 'बहु-कार्य कर्मचारी (एमटीएस) परीक्षा' },
    { code: 'SSC_GD', body: 'SSC', nameEn: 'GD Constable Examination', nameHi: 'जीडी कांस्टेबल परीक्षा' },
    { code: 'SSC_JE', body: 'SSC', nameEn: 'Junior Engineer (JE) Examination', nameHi: 'कनिष्ठ अभियंता (जेई) परीक्षा' },
    { code: 'SSC_CPO', body: 'SSC', nameEn: 'Central Police Organisation (CPO) Sub-Inspector Examination', nameHi: 'केंद्रीय पुलिस संगठन (सीपीओ) उप-निरीक्षक परीक्षा' },
    { code: 'SSC_STENO', body: 'SSC', nameEn: 'Stenographer Examination', nameHi: 'आशुलिपिक परीक्षा' },
    { code: 'IBPS_PO', body: 'IBPS', nameEn: 'Probationary Officer (PO)', nameHi: 'प्रोबेशनरी ऑफिसर (पीओ)' },
    { code: 'IBPS_CLERK', body: 'IBPS', nameEn: 'Clerk', nameHi: 'क्लर्क' },
    { code: 'IBPS_RRB_PO', body: 'IBPS', nameEn: 'RRB Officer Scale I (PO)', nameHi: 'आरआरबी अधिकारी स्केल I (पीओ)' },
    { code: 'IBPS_RRB_CLERK', body: 'IBPS', nameEn: 'RRB Office Assistant', nameHi: 'आरआरबी कार्यालय सहायक' },
    { code: 'SBI_PO', body: 'SBI', nameEn: 'Probationary Officer (PO)', nameHi: 'प्रोबेशनरी ऑफिसर (पीओ)' },
    { code: 'SBI_CLERK', body: 'SBI', nameEn: 'Junior Associate (Clerk)', nameHi: 'जूनियर एसोसिएट (क्लर्क)' },
    { code: 'RBI_GRADE_B', body: 'RBI', nameEn: 'Grade B Officer', nameHi: 'ग्रेड बी अधिकारी' },
    { code: 'RBI_ASSISTANT', body: 'RBI', nameEn: 'Assistant', nameHi: 'सहायक' },
    { code: 'RRB_NTPC', body: 'RRB', nameEn: 'Non-Technical Popular Categories (NTPC)', nameHi: 'गैर-तकनीकी लोकप्रिय श्रेणियाँ (एनटीपीसी)' },
    { code: 'RRB_GROUP_D', body: 'RRB', nameEn: 'Group D', nameHi: 'ग्रुप डी' },
    { code: 'RRB_JE', body: 'RRB', nameEn: 'Junior Engineer (JE)', nameHi: 'कनिष्ठ अभियंता (जेई)' },
    { code: 'RRB_ALP', body: 'RRB', nameEn: 'Assistant Loco Pilot (ALP)', nameHi: 'सहायक लोको पायलट (एएलपी)' },
    { code: 'AGNIVEER_ARMY', body: 'ARMED_FORCES', nameEn: 'Agniveer (Indian Army)', nameHi: 'अग्निवीर (भारतीय सेना)' },
    { code: 'AGNIVEER_NAVY', body: 'ARMED_FORCES', nameEn: 'Agniveer (Indian Navy)', nameHi: 'अग्निवीर (भारतीय नौसेना)' },
    { code: 'AGNIVEER_AIRFORCE', body: 'ARMED_FORCES', nameEn: 'Agniveer Vayu (Indian Air Force)', nameHi: 'अग्निवीर वायु (भारतीय वायु सेना)' },
    { code: 'AFCAT', body: 'ARMED_FORCES', nameEn: 'Air Force Common Admission Test (AFCAT)', nameHi: 'वायु सेना सामान्य प्रवेश परीक्षा (एएफसीएटी)' },
    { code: 'CTET', body: 'CBSE', nameEn: 'Central Teacher Eligibility Test (CTET)', nameHi: 'केंद्रीय शिक्षक पात्रता परीक्षा (सीटीईटी)' },
    { code: 'UGC_NET', body: 'UGC', nameEn: 'National Eligibility Test (NET)', nameHi: 'राष्ट्रीय पात्रता परीक्षा (नेट)' },
    { code: 'LIC_AAO', body: 'LIC', nameEn: 'Assistant Administrative Officer (AAO)', nameHi: 'सहायक प्रशासनिक अधिकारी (एएओ)' },
    { code: 'LIC_ADO', body: 'LIC', nameEn: 'Apprentice Development Officer (ADO)', nameHi: 'प्रशिक्षु विकास अधिकारी (एडीओ)' },
  ] as const;
  for (const e of CENTRAL_EXAMS) {
    // Non-null: e.body is always one of the codes just upserted into
    // centralBodyRows above (CENTRAL_EXAMS is hand-authored against
    // CENTRAL_BODIES), TS just can't see that invariant through the Record index.
    await upsertExam(e.code, e.nameEn, e.nameHi, centralBodyRows[e.body]!.id, null);
  }

  // Remaining 26 states' Public Service Commissions — one body + one
  // flagship combined-civil-service exam each. Body code is `${state}_PSC`
  // deliberately (not a colloquial acronym) to stay collision-free — e.g.
  // Karnataka's and Kerala's PSCs are both informally "KPSC" in everyday use.
  const STATE_PSC = [
    { state: 'UP', nameEn: 'PCS (Combined State/Upper Subordinate Services) Examination', nameHi: 'पीसीएस (संयुक्त राज्य/उच्च अधीनस्थ सेवा) परीक्षा' },
    { state: 'MP', nameEn: 'State Service Examination (SSE)', nameHi: 'राज्य सेवा परीक्षा' },
    { state: 'RJ', nameEn: 'Rajasthan Administrative Service (RAS) Combined Competitive Examination', nameHi: 'राजस्थान प्रशासनिक सेवा (आरएएस) संयुक्त प्रतियोगी परीक्षा' },
    { state: 'WB', nameEn: 'West Bengal Civil Service (WBCS) Examination', nameHi: 'पश्चिम बंगाल सिविल सेवा (डब्ल्यूबीसीएस) परीक्षा' },
    { state: 'MH', nameEn: 'Maharashtra Rajyaseva (State Service) Examination', nameHi: 'महाराष्ट्र राज्यसेवा परीक्षा' },
    { state: 'TN', nameEn: 'Combined Civil Services Examination (Group I)', nameHi: 'संयुक्त सिविल सेवा परीक्षा (समूह I)' },
    { state: 'KA', nameEn: 'Karnataka Administrative Service (KAS) Examination', nameHi: 'कर्नाटक प्रशासनिक सेवा (केएएस) परीक्षा' },
    { state: 'AP', nameEn: 'Group I Services Examination', nameHi: 'समूह I सेवा परीक्षा' },
    { state: 'TS', nameEn: 'Group I Services Examination', nameHi: 'समूह I सेवा परीक्षा' },
    { state: 'GJ', nameEn: 'State Service (Class 1/2) Examination', nameHi: 'राज्य सेवा (वर्ग 1/2) परीक्षा' },
    { state: 'HR', nameEn: 'Haryana Civil Service (HCS) Examination', nameHi: 'हरियाणा सिविल सेवा (एचसीएस) परीक्षा' },
    { state: 'HP', nameEn: 'Himachal Pradesh Administrative Service (HAS) Examination', nameHi: 'हिमाचल प्रदेश प्रशासनिक सेवा (एचएएस) परीक्षा' },
    { state: 'CG', nameEn: 'State Service Examination (SSE)', nameHi: 'राज्य सेवा परीक्षा' },
    { state: 'OD', nameEn: 'Odisha Civil Service (OCS) Examination', nameHi: 'ओडिशा सिविल सेवा (ओसीएस) परीक्षा' },
    { state: 'PB', nameEn: 'Punjab Civil Service (PCS) Examination', nameHi: 'पंजाब सिविल सेवा (पीसीएस) परीक्षा' },
    { state: 'UK', nameEn: 'PCS (Combined State/Upper Subordinate Services) Examination', nameHi: 'पीसीएस (संयुक्त राज्य/उच्च अधीनस्थ सेवा) परीक्षा' },
    { state: 'AS', nameEn: 'Combined Competitive Examination (CCE)', nameHi: 'संयुक्त प्रतियोगी परीक्षा' },
    { state: 'KL', nameEn: 'Kerala Administrative Service (KAS) Examination', nameHi: 'केरल प्रशासनिक सेवा (केएएस) परीक्षा' },
    // These 8 (small/Northeast states) previously all shared the identical
    // generic label "Civil Service Examination" with no distinguishing
    // acronym — harmless for data integrity (codes/bodies still unique) but
    // confusing in any flat, unfiltered exam list (e.g. ExamsManager.tsx's
    // admin view). Prefixed with the state name for a self-disambiguating
    // label; no acronym added since I'm not confident enough in the exact
    // colloquial one for each of these to assert it (e.g. "MCS" would
    // otherwise collide between Meghalaya and Manipur).
    { state: 'GA', nameEn: 'Goa Civil Service Examination', nameHi: 'गोवा सिविल सेवा परीक्षा' },
    { state: 'MN', nameEn: 'Manipur Civil Service Examination', nameHi: 'मणिपुर सिविल सेवा परीक्षा' },
    { state: 'ML', nameEn: 'Meghalaya Civil Service Examination', nameHi: 'मेघालय सिविल सेवा परीक्षा' },
    { state: 'MZ', nameEn: 'Mizoram Civil Service Examination', nameHi: 'मिज़ोरम सिविल सेवा परीक्षा' },
    { state: 'NL', nameEn: 'Nagaland Civil Service Examination', nameHi: 'नागालैंड सिविल सेवा परीक्षा' },
    { state: 'SK', nameEn: 'Sikkim State Civil Service Examination', nameHi: 'सिक्किम राज्य सिविल सेवा परीक्षा' },
    { state: 'TR', nameEn: 'Tripura Civil Service Examination', nameHi: 'त्रिपुरा सिविल सेवा परीक्षा' },
    { state: 'AR', nameEn: 'Arunachal Pradesh Civil Service Examination', nameHi: 'अरुणाचल प्रदेश सिविल सेवा परीक्षा' },
  ] as const;
  for (const p of STATE_PSC) {
    // Non-null: p.state is always one of OTHER_STATES' codes (STATE_PSC is
    // hand-authored against it), TS just can't see that through the Record index.
    const stateRow = otherStateRows[p.state]!;
    const body = await prisma.examBody.upsert({
      where: { code: `${p.state}_PSC` },
      update: {},
      create: { code: `${p.state}_PSC`, nameEn: `${stateRow.nameEn} Public Service Commission`, nameHi: `${stateRow.nameHi} लोक सेवा आयोग` },
    });
    await upsertExam(`${p.state}_PSC_CCE`, p.nameEn, p.nameHi, body.id, stateRow.id);
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

  // bpscPt/jsscCgl names kept for the dev-only demo seeding below (which
  // references ref.bpscPt!.id etc.) — they now point at the real, always-
  // seeded BPSC_CCE/JSSC_CGL exams above rather than separate placeholders.
  return { bihar, jharkhand, bpscPt: bpscCce, jsscCgl };
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
  await upsertAssignment(teacher.id, 'EXAM', { stateId: ref.bihar.id, examId: ref.bpscPt!.id });
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
      studentProfile: { create: { fullName: 'Demo Student', stateId: ref.bihar.id, targetExamId: ref.bpscPt!.id } },
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
      studentProfile: { create: { fullName: 'Green Valley Student', stateId: ref.bihar.id, targetExamId: ref.bpscPt!.id, onboardedAt: new Date() } },
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
      examId: ref.bpscPt!.id,
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
      examId: ref.jsscCgl!.id,
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
    { id: 'seed-faq-5', questionHi: 'मेरे पास संस्थान कोड है — इसे कैसे उपयोग करूं?', questionEn: 'I have an institute code — how do I use it?', answerHi: 'कोर्स पेज पर “संस्थान कोड” दर्ज करें — सत्यापित होते ही आपको अपने संस्थान का विशेष मूल्य दिखेगा।', answerEn: 'Enter it on the course page under “Institute code” — once verified, you’ll see your institute’s special price for that course.', sequence: 4 },
    { id: 'seed-faq-6', questionHi: 'मेरे पास कूपन कोड है — इसे कहाँ दर्ज करूं?', questionEn: 'I have a coupon code — where do I enter it?', answerHi: 'खरीदते समय “कूपन कोड है?” पर क्लिक करें और भुगतान से पहले कोड दर्ज करें — छूट तुरंत लागू होगी।', answerEn: 'At checkout, click “Have a coupon code?” and enter it before paying — the discount is applied immediately.', sequence: 5 },
    { id: 'seed-faq-7', questionHi: 'रिफंड का अनुरोध कैसे करें और इसमें कितना समय लगता है?', questionEn: 'How do I request a refund, and how long does it take?', answerHi: 'सहायता (Contact) पेज से हमसे संपर्क करें — हमारी टीम अनुरोध की समीक्षा करती है और अनुमोदन के बाद प्रक्रिया शुरू करती है। यह तुरंत होने वाली स्वचालित प्रक्रिया नहीं है।', answerEn: 'Contact us via the Support page with your order details — our team reviews each request and processes approved refunds manually. This isn’t an instant automated process.', sequence: 6 },
    { id: 'seed-faq-8', questionHi: 'पैसे कट गए पर एक्सेस नहीं मिला — क्या करूं?', questionEn: 'My payment was deducted but I didn’t get access — what should I do?', answerHi: 'घबराएं नहीं — ज़्यादातर मामलों में भुगतान सत्यापन में कुछ मिनट लगते हैं। फिर भी एक्सेस न मिले तो ऑर्डर आईडी के साथ सहायता टीम से संपर्क करें।', answerEn: 'Don’t worry — payment verification can take a few minutes. If access still doesn’t appear, contact support with your order ID and we’ll check it.', sequence: 7 },
    { id: 'seed-faq-9', questionHi: 'टेस्ट का परिणाम और रैंक कब दिखता है?', questionEn: 'When do test results and rank show up?', answerHi: 'यह टेस्ट पर निर्भर करता है — कुछ टेस्ट सबमिट करते ही परिणाम दिखाते हैं, कुछ निर्धारित समय के बाद जारी होते हैं। यह जानकारी टेस्ट शुरू करने से पहले ही दिखाई जाती है।', answerEn: 'It depends on the test — some show results immediately after you submit, others release them at a scheduled time. This is shown before you start the test.', sequence: 8 },
    { id: 'seed-faq-10', questionHi: 'क्या मैं टेस्ट दोबारा दे सकता/सकती हूं?', questionEn: 'Can I retake a test?', answerHi: 'हाँ, अधिकतर टेस्ट में सीमित बार दोबारा प्रयास की अनुमति है — कितनी बार, यह टेस्ट के पेज पर दिखाया जाता है।', answerEn: 'Yes — most tests allow a limited number of attempts, shown on the test’s page.', sequence: 9 },
    { id: 'seed-faq-11', questionHi: 'दैनिक स्टडी प्लान कैसे काम करता है?', questionEn: 'How does the daily Study Plan work?', answerHi: 'आपकी लक्ष्य परीक्षा और अब तक की प्रगति के आधार पर, यह हर दिन बताता है कि आज क्या पढ़ना है — बजाय इसके कि आप खुद वीडियो की लंबी लिस्ट में उलझें।', answerEn: 'Based on your target exam and progress so far, it tells you exactly what to study each day — instead of you having to figure it out from a long video list.', sequence: 10 },
    { id: 'seed-faq-12', questionHi: 'मेरी कमज़ोर टॉपिक लिस्ट कैसे बनती है?', questionEn: 'How is my weak-topic list generated?', answerHi: 'हर टेस्ट के बाद आपके गलत उत्तरों का विश्लेषण करके कमज़ोर टॉपिक सामने लाए जाते हैं, ताकि रिवीज़न सही जगह पर केंद्रित हो।', answerEn: 'After each test, your incorrect answers are analysed to surface weak topics — so revision focuses on exactly where you need it.', sequence: 11 },
    { id: 'seed-faq-13', questionHi: 'डाउट (सवाल) कैसे पूछें और जवाब कब मिलेगा?', questionEn: 'How do I ask a doubt, and when will I get an answer?', answerHi: 'किसी भी पाठ, प्रश्न या टेस्ट से जुड़ा डाउट टेक्स्ट या फ़ोटो के साथ पूछ सकते हैं। इसे टीचर या रिव्यूअर को सौंपा जाता है और इसका स्टेटस अपडेट होता रहता है।', answerEn: 'You can ask a doubt (with text or a photo) linked to any lesson, question or test. It’s assigned to a teacher/reviewer and its status updates as it’s worked on.', sequence: 12 },
    { id: 'seed-faq-14', questionHi: 'क्या मैं कंटेंट ऑफ़लाइन डाउनलोड कर सकता हूं?', questionEn: 'Can I download content for offline use?', answerHi: 'नहीं — पाठ और PDF कोर्स की सुरक्षा हेतु वॉटरमार्क के साथ केवल ऐप के अंदर देखे जा सकते हैं, डाउनलोड की अनुमति नहीं है। जब तक आपका एक्सेस सक्रिय है, आप उन्हें कभी भी दोबारा देख सकते हैं।', answerEn: 'No — lessons and PDFs are watermarked and view-only within the app to protect course content; downloading isn’t supported. You can revisit them anytime while your access is active.', sequence: 13 },
    { id: 'seed-faq-15', questionHi: 'मैं स्टाफ़ या संस्थान एडमिन हूं — दो-चरणीय सत्यापन (MFA) कैसे सेट करूं?', questionEn: 'I’m a staff member or institute admin — how do I set up two-factor authentication (MFA)?', answerHi: 'एडमिन पैनल में Profile पर जाएं और “दो-चरणीय सत्यापन सेट करें” पर क्लिक करें। किसी authenticator ऐप (Google Authenticator, Authy, या पासवर्ड मैनेजर) से QR कोड स्कैन करें — या मैन्युअल की डालें — फिर 6-अंकों के कोड से पुष्टि करें। इसके बाद हर साइन इन पर ऐप का कोड माँगा जाएगा; अपने कंप्यूटर पर बार-बार न पूछे जाने के लिए लॉगिन पर “इस डिवाइस पर 60 दिनों तक याद रखें” चुनें।', answerEn: 'In the Admin panel, go to Profile and click “Set up two-factor authentication”. Scan the QR code with an authenticator app (Google Authenticator, Authy, or your password manager) — or enter the manual key — then confirm with the 6-digit code. Every sign-in will then ask for a code from your app; check “Trust this device for 60 days” at login to skip repeated prompts on your own computer.', sequence: 14 },
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
  // Launch pricing (2026-08-12): Starter/Growth cut from their original
  // illustrative values to lower the barrier for a first-ever paying
  // institute — Pro is unchanged since bigger institutes are less price-
  // sensitive and aren't the day-one adoption blocker.
  const plans = [
    { code: 'STARTER', nameHi: 'स्टार्टर', nameEn: 'Starter', priceMonthlyMinor: 149900, priceAnnualMinor: 149900 * 10, maxActiveStudents: 250, maxStaffSeats: 5, storageGb: 50, internalFeeBps: 300, externalFeeBps: 1800, sequence: 0 },
    { code: 'GROWTH', nameHi: 'ग्रोथ', nameEn: 'Growth', priceMonthlyMinor: 699900, priceAnnualMinor: 699900 * 10, maxActiveStudents: 1500, maxStaffSeats: 20, storageGb: 250, internalFeeBps: 150, externalFeeBps: 1500, sequence: 1 },
    { code: 'PRO', nameHi: 'प्रो', nameEn: 'Pro', priceMonthlyMinor: 1499900, priceAnnualMinor: 1499900 * 10, maxActiveStudents: 5000, maxStaffSeats: 200, storageGb: 1000, internalFeeBps: 50, externalFeeBps: 1200, sequence: 2 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { code: p.code }, update: p, create: p });
  }
}

/** Student subscription plans — real launch catalog. A plan is a `Product`
 *  row (kind: 'SUBSCRIPTION'), not a distinct model — see
 *  student-plans.service.ts's doc comment. `examId: null` = Pro/all-access;
 *  `examId` set = Plus, scoped to that one exam. Free isn't a row at all —
 *  it's just "no entitlement" (see Lesson.freePreview / Test.freeDemo for
 *  what that tier actually unlocks).
 *
 *  Launch scope deliberately doesn't cover all 66 exams with a Plus variant
 *  (that's a lot of near-duplicate rows for exams with zero live institutes
 *  yet) — just Bihar/Jharkhand's flagship exams, matching where RajyaRank
 *  actually has institutes today. Pro (all-access) already covers every
 *  exam regardless. Add more Plus variants as demand data comes in, same
 *  phased approach as the exam catalog itself. */
async function seedStudentPlans(ref: Awaited<ReturnType<typeof seedReference>>) {
  // Product has no natural unique key for a SUBSCRIPTION row (courseId is
  // always null, so the model's @@unique([courseId, kind, audience]) doesn't
  // disambiguate — Postgres allows unlimited coexisting NULLs there). This
  // does its own find-then-update-or-create keyed on (examId, validityDays),
  // same idempotency pattern as upsertExam in seedReference above.
  async function upsertStudentPlan(input: {
    examId: string | null;
    validityDays: number;
    titleHi: string;
    titleEn: string;
    priceMinor: number;
    originalPriceMinor: number | null;
  }) {
    const existing = await prisma.product.findFirst({
      where: { kind: 'SUBSCRIPTION', examId: input.examId, validityDays: input.validityDays },
    });
    const data = {
      kind: 'SUBSCRIPTION' as const,
      accessType: 'SUBSCRIPTION' as const,
      audience: 'PUBLIC' as const,
      courseId: null,
      examId: input.examId,
      titleHi: input.titleHi,
      titleEn: input.titleEn,
      priceMinor: input.priceMinor,
      originalPriceMinor: input.originalPriceMinor,
      validityDays: input.validityDays,
      currency: 'INR',
      active: true,
    };
    if (existing) return prisma.product.update({ where: { id: existing.id }, data });
    return prisma.product.create({ data });
  }

  await upsertStudentPlan({
    examId: null,
    validityDays: 30,
    titleHi: 'प्रो — सभी परीक्षाएँ (मासिक)',
    titleEn: 'Pro — All Access (Monthly)',
    priceMinor: 29900, // ₹299
    originalPriceMinor: null,
  });
  await upsertStudentPlan({
    examId: null,
    validityDays: 365,
    titleHi: 'प्रो — सभी परीक्षाएँ (वार्षिक)',
    titleEn: 'Pro — All Access (Annual)',
    priceMinor: 199900, // ₹1,999 (~44% off the monthly rate annualized)
    originalPriceMinor: 29900 * 12,
  });

  const PLUS_EXAMS = [
    { exam: ref.bpscPt, labelHi: 'बीपीएससी सीसीई', labelEn: 'BPSC CCE' },
    { exam: ref.jsscCgl, labelHi: 'जेएसएससी सीजीएल', labelEn: 'JSSC CGL' },
  ];
  for (const p of PLUS_EXAMS) {
    await upsertStudentPlan({
      examId: p.exam.id,
      validityDays: 30,
      titleHi: `प्लस — ${p.labelHi} (मासिक)`,
      titleEn: `Plus — ${p.labelEn} (Monthly)`,
      priceMinor: 14900, // ₹149
      originalPriceMinor: null,
    });
    await upsertStudentPlan({
      examId: p.exam.id,
      validityDays: 365,
      titleHi: `प्लस — ${p.labelHi} (वार्षिक)`,
      titleEn: `Plus — ${p.labelEn} (Annual)`,
      priceMinor: 99900, // ₹999
      originalPriceMinor: 14900 * 12,
    });
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
  console.log('Seeding student subscription plan catalog…');
  await seedStudentPlans(ref);
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
