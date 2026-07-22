/** Quote-aware CSV parser (handles commas/quotes inside fields). Shared by
 *  QuestionImport (Question Bank page) and CreateContentWizard's mock-test
 *  bulk-upload step — both need the identical question-row CSV format. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// subjectId/topicId accept either the real ID or the subject/topic's exact
// name (case-insensitive) — the backend resolves a name to its ID, falling
// back to a clear "not found"/"ambiguous, use the ID" error rather than a
// raw foreign-key failure. topicId is optional: filling it in attributes the
// question to a specific topic for weak-topic analysis; left blank, the
// question still counts (at the subject level) rather than being silently
// excluded from analysis.
const HEADERS = ['type', 'subjectId', 'topicId', 'textEn', 'textHi', 'optionA', 'optionB', 'optionC', 'optionD', 'correct', 'difficulty', 'marks', 'negativeMarks'];
export const QUESTION_CSV_TEMPLATE =
  HEADERS.join(',') +
  '\n' +
  'SINGLE_CHOICE,Polity,Fundamental Rights,In which part are Fundamental Rights?,मौलिक अधिकार किस भाग में हैं?,Part I,Part II,Part III,Part IV,C,MEDIUM,1,0.25\n';

export interface ParsedQuestionRow {
  type: string;
  subjectId: string;
  topicId?: string;
  textEn?: string;
  textHi?: string;
  options: { key: string; en?: string }[];
  correctAnswer: string[];
  difficulty: string;
  marks: number;
  negativeMarks: number;
}

/** Parses the shared question CSV format into rows ready to POST. */
export function parseQuestionCsv(text: string): ParsedQuestionRow[] {
  const table = parseCsv(text);
  if (table.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const header = table[0]!.map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  return table.slice(1).map((r) => {
    const get = (name: string) => (idx(name) >= 0 ? (r[idx(name)] ?? '').trim() : '');
    const options = ['A', 'B', 'C', 'D']
      .map((k) => ({ key: k, en: get(`option${k}`) || undefined }))
      .filter((o) => o.en);
    return {
      type: get('type') || 'SINGLE_CHOICE',
      subjectId: get('subjectId'),
      topicId: get('topicId') || undefined,
      textEn: get('textEn') || undefined,
      textHi: get('textHi') || undefined,
      options,
      correctAnswer: get('correct') ? get('correct').split('|').map((s) => s.trim()) : [],
      difficulty: get('difficulty') || 'MEDIUM',
      marks: Number(get('marks') || '1'),
      negativeMarks: Number(get('negativeMarks') || '0'),
    };
  });
}
