/// Static marketing copy ported verbatim from the website's own homepage
/// (apps/web/app/[locale]/page.tsx) — these are plain hardcoded arrays
/// there too, not DB-backed, so there's nothing to fetch; this is the
/// Flutter equivalent of that same literal content, English only (the app
/// has no Hindi/locale-switching infrastructure, same reasoning as the
/// typography pass).
library;

class AppFeature {
  const AppFeature(this.emoji, this.title, this.description);

  final String emoji;
  final String title;
  final String description;
}

const appFeatures = [
  AppFeature(
    '🗓️',
    'Daily study plan',
    'What to study each day — lessons, practice, current affairs and revision.',
  ),
  AppFeature(
    '🎥',
    'Short concept videos',
    'Chapter-wise videos that run on low data, with resume playback.',
  ),
  AppFeature(
    '📄',
    'Protected notes',
    'Course-linked PDFs, bookmarks and revision-friendly short notes.',
  ),
  AppFeature(
    '🧪',
    'Smart mock tests',
    'Accuracy, time, weak topics, skipped questions and detailed solutions.',
  ),
  AppFeature(
    '🔁',
    'Revision centre',
    'Wrong questions, bookmarks and pending lessons in one place.',
  ),
  AppFeature(
    '💬',
    'Doubt support',
    'Ask by text or image; get lesson-linked answers.',
  ),
  AppFeature(
    '🔔',
    'Exam alerts',
    'Official notices, admit cards, answer keys and important-date reminders.',
  ),
  AppFeature(
    '📶',
    'Low-network friendly',
    'Lightweight pages, test auto-save and selected content offline-ready.',
  ),
];

enum ExamCardTag { popular, newTag }

class ExamCard {
  const ExamCard({
    required this.emoji,
    required this.title,
    required this.tag,
    required this.official,
    required this.description,
    required this.meta,
    required this.price,
    required this.validity,
  });

  final String emoji;
  final String title;
  final ExamCardTag tag;
  final bool official;
  final String description;
  final List<String> meta;
  final String price;
  final String validity;
}

/// Informational-only, same as the website — these aren't backed by real
/// courses/pricing yet, so there's deliberately no "Buy"/tap-through CTA.
const examCards = [
  ExamCard(
    emoji: '🏛️',
    title: 'SSC CGL',
    tag: ExamCardTag.popular,
    official: true,
    description: 'Complete Combined Graduate Level prep — syllabus plan, practice sets and mock tests.',
    meta: ['Hindi', '60+ videos', '1500+ MCQs'],
    price: '₹499',
    validity: 'Exam-cycle validity',
  ),
  ExamCard(
    emoji: '🚂',
    title: 'Railways (RRB)',
    tag: ExamCardTag.newTag,
    official: false,
    description: 'Subject-wise study plan, previous-year questions and full-length test series.',
    meta: ['Bilingual', '80+ videos', '20 mocks'],
    price: '₹699',
    validity: '6 months validity',
  ),
  ExamCard(
    emoji: '🛡️',
    title: 'State PSC',
    tag: ExamCardTag.popular,
    official: true,
    description: 'Concept videos, MCQs and exam-oriented revision notes.',
    meta: ['Hindi', '50+ videos', '1200+ MCQs'],
    price: '₹499',
    validity: 'Exam-cycle validity',
  ),
  ExamCard(
    emoji: '🏦',
    title: 'Banking (IBPS)',
    tag: ExamCardTag.newTag,
    official: false,
    description: 'Structured prep for general studies, reasoning, language and quantitative aptitude.',
    meta: ['Bilingual', '90+ videos', '25 mocks'],
    price: '₹799',
    validity: '8 months validity',
  ),
  ExamCard(
    emoji: '🎖️',
    title: 'Defence (NDA/Agniveer)',
    tag: ExamCardTag.popular,
    official: true,
    description:
        'Full written-exam prep covering maths, general knowledge and English.',
    meta: ['Hindi', '45+ videos', 'Practice PDFs'],
    price: '₹399',
    validity: '4 months validity',
  ),
  ExamCard(
    emoji: '📚',
    title: 'Teaching (CTET/TET)',
    tag: ExamCardTag.newTag,
    official: false,
    description:
        'Prep with child development, pedagogy and subject-wise practice sets.',
    meta: ['Bilingual', '55+ videos', '15 mocks'],
    price: '₹499',
    validity: '6 months validity',
  ),
];
