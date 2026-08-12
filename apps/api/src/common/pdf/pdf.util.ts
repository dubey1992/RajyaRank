import PDFDocument from 'pdfkit';

function rupees(minor: number) {
  return `Rs. ${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// Label width stops at 340 (leaving a gutter before the amount column at
// x=400) so a long line-item description — a real course title, not a short
// fixed label — wraps instead of running under the amount. Row height then
// follows the taller of the two wrapped columns, not a fixed moveDown, so a
// two-line label doesn't visually collide with whatever row comes next.
function lineRow(doc: PDFKit.PDFDocument, label: string, value: string, bold = false) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
  const y = doc.y;
  const labelWidth = 340;
  const valueWidth = 145;
  doc.text(label, 50, y, { width: labelWidth });
  doc.text(value, 400, y, { width: valueWidth, align: 'right' });
  const rowHeight = Math.max(doc.heightOfString(label, { width: labelWidth }), doc.heightOfString(value, { width: valueWidth }));
  doc.y = y + rowHeight + 7;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const INVOICE_STATUS_COLOR: Record<string, string> = {
  PAID: '#0f8b78',
  PENDING: '#d97706',
  OVERDUE: '#dc2626',
  VOID: '#65798c',
};

const BILLING_CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};

/** Institution subscription invoice — Super Admin ↔ institution billing.
 *  Every field below is real data already captured for the subscription
 *  (plan entitlements, billing period, org contact) — nothing fabricated. */
export async function renderInstitutionInvoicePdf(input: {
  invoiceNumber: string;
  issuedAt: Date;
  orgName: string;
  orgCode: string;
  billingContactName: string | null;
  billingContactEmail: string | null;
  billingContactPhone: string | null;
  planNameEn: string;
  billingCycle: string;
  periodLabel: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  maxActiveStudents: number;
  maxStaffSeats: number;
  storageGb: number;
  basePlanMinor: number;
  addOnsMinor: number;
  taxMinor: number;
  totalMinor: number;
  status: string;
  dueAt: Date;
  paidAt: Date | null;
  paymentReference: string | null;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const LEFT = 50;
  const RIGHT = 545;

  // ── Brand header ──
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0b2f4f').text('RajyaRank', LEFT, doc.y);
  doc.font('Helvetica').fontSize(10).fillColor('#65798c').text('Government Exam Learning Platform', LEFT, doc.y + 1);
  doc.fontSize(9).fillColor('#65798c').text('Institution subscription billing  ·  support@rajyarank.com', LEFT);
  doc.moveDown(1.1);

  // ── Title + status badge ──
  const titleY = doc.y;
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b2f4f').text('Tax Invoice', LEFT, titleY);
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  doc.text(`Invoice number: ${input.invoiceNumber}`, LEFT, titleY + 26);
  doc.text(`Issued: ${formatDate(input.issuedAt)}   ·   Due: ${formatDate(input.dueAt)}`, LEFT, titleY + 41);

  const statusColor = INVOICE_STATUS_COLOR[input.status] ?? '#65798c';
  const statusLabel = input.status + (input.paidAt ? ` — paid ${formatDate(input.paidAt)}` : '');
  const badgeWidth = 195;
  doc.roundedRect(RIGHT - badgeWidth, titleY, badgeWidth, 24, 4).fill(statusColor);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(statusLabel, RIGHT - badgeWidth, titleY + 7, { width: badgeWidth, align: 'center' });

  doc.y = titleY + 62;
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(1);

  // ── Billed from / Billed to (two columns) ──
  const colY = doc.y;
  const colWidth = 220;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('BILLED FROM', LEFT, colY, { characterSpacing: 0.3 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b2f4f').text('RajyaRank', LEFT, colY + 14);
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text('support@rajyarank.com', LEFT, colY + 30, { width: colWidth });

  const rightColX = LEFT + 275;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('BILLED TO', rightColX, colY, { characterSpacing: 0.3 });

  // Each line's height is measured with heightOfString before the next one is
  // placed — the previous fixed "+14" offsets assumed every line fit on one
  // row, so a long org name or a long name+email combined onto one line
  // ("  ·  "-joined) would wrap and visually collide with whatever came next.
  // Name, email, and phone are also now three separate lines instead of one
  // combined line, since that combined line was the one actually overflowing.
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b2f4f');
  doc.text(input.orgName, rightColX, colY + 14, { width: colWidth });
  let billToY = colY + 14 + doc.heightOfString(input.orgName, { width: colWidth }) + 4;

  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  const codeLine = `Institution code: ${input.orgCode}`;
  doc.text(codeLine, rightColX, billToY, { width: colWidth });
  billToY += doc.heightOfString(codeLine, { width: colWidth }) + 2;

  for (const line of [input.billingContactName, input.billingContactEmail, input.billingContactPhone]) {
    if (!line) continue;
    doc.text(line, rightColX, billToY, { width: colWidth });
    billToY += doc.heightOfString(line, { width: colWidth }) + 2;
  }

  doc.y = Math.max(colY + 30 + 14, billToY) + 8;
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(1);

  // ── Subscription summary ──
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('SUBSCRIPTION', LEFT, doc.y, { characterSpacing: 0.3 });
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0b2f4f').text(`${input.planNameEn} plan  ·  ${BILLING_CYCLE_LABEL[input.billingCycle] ?? input.billingCycle}`, LEFT, doc.y + 3);
  const periodText =
    input.periodStart && input.periodEnd
      ? `Billing period: ${formatDate(input.periodStart)} – ${formatDate(input.periodEnd)}`
      : `Billing period: ${input.periodLabel}`;
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(periodText, LEFT, doc.y + 4);
  doc.moveDown(0.9);

  // Plan-entitlements callout — genuinely useful "what am I paying for" detail.
  const calloutY = doc.y;
  doc.roundedRect(LEFT, calloutY, RIGHT - LEFT, 32, 4).fillAndStroke('#f4f6f8', '#e5eaef');
  doc.font('Helvetica').fontSize(9).fillColor('#374151').text(
    `Plan includes:  up to ${input.maxActiveStudents.toLocaleString('en-IN')} active students  ·  ${input.maxStaffSeats} staff seats`,
    LEFT + 12,
    calloutY + 11,
    { width: RIGHT - LEFT - 24 },
  );
  doc.y = calloutY + 32 + 18;

  // ── Line items table ──
  const tableTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c');
  doc.text('DESCRIPTION', LEFT, tableTop, { characterSpacing: 0.3 });
  doc.text('AMOUNT', 400, tableTop, { width: 145, align: 'right', characterSpacing: 0.3 });
  doc.moveTo(LEFT, tableTop + 16).lineTo(RIGHT, tableTop + 16).strokeColor('#dbe5ed').stroke();
  doc.y = tableTop + 24;

  lineRow(doc, `${input.planNameEn} plan — ${(BILLING_CYCLE_LABEL[input.billingCycle] ?? input.billingCycle).toLowerCase()} subscription`, rupees(input.basePlanMinor));
  if (input.addOnsMinor) lineRow(doc, 'Add-ons / overage', rupees(input.addOnsMinor));
  if (input.taxMinor) lineRow(doc, 'GST / tax', rupees(input.taxMinor));
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(0.4);
  lineRow(doc, 'Total', rupees(input.totalMinor), true);
  doc.moveDown(1);

  if (input.paymentReference) {
    doc.font('Helvetica').fontSize(9).fillColor('#65798c').text(`Payment reference: ${input.paymentReference}`, LEFT);
    doc.moveDown(0.3);
  }

  doc.moveDown(1.2);
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(0.8);
  doc.fontSize(8).fillColor('#65798c').text(
    `System-generated invoice for platform subscription billing. Questions? Write to support@rajyarank.com. Generated ${formatDate(new Date())}.`,
    LEFT,
    doc.y,
    { width: RIGHT - LEFT },
  );
  return collect(doc);
}

/** Student course-purchase receipt — issued by the platform (public sales) or
 *  on behalf of the owning institute (institute-audience sales). Mirrors the
 *  institution invoice's layout (brand header, status badge, two-column
 *  billing block, line-item table) rather than the old plain text dump, so a
 *  student gets the same document quality a paying customer expects. */
export async function renderOrderReceiptPdf(input: {
  receiptNumber: string;
  sellerName: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  productTitle: string;
  amountMinor: number;
  paidAt: Date;
  providerPaymentId: string | null;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const LEFT = 50;
  const RIGHT = 545;

  // ── Brand header ──
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0b2f4f').text('RajyaRank', LEFT, doc.y);
  doc.font('Helvetica').fontSize(10).fillColor('#65798c').text('Government Exam Learning Platform', LEFT, doc.y + 1);
  doc.fontSize(9).fillColor('#65798c').text('Course purchase receipt  ·  support@rajyarank.com', LEFT);
  doc.moveDown(1.1);

  // ── Title + PAID badge ──
  const titleY = doc.y;
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b2f4f').text('Payment Receipt', LEFT, titleY);
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  doc.text(`Receipt number: ${input.receiptNumber}`, LEFT, titleY + 26);
  doc.text(`Paid: ${formatDate(input.paidAt)}`, LEFT, titleY + 41);

  const badgeWidth = 90;
  doc.roundedRect(RIGHT - badgeWidth, titleY, badgeWidth, 24, 4).fill(INVOICE_STATUS_COLOR.PAID);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('PAID', RIGHT - badgeWidth, titleY + 7, { width: badgeWidth, align: 'center' });

  doc.y = titleY + 62;
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(1);

  // ── Sold by / Billed to (two columns) ──
  // Same reflow-by-heightOfString approach as the institution invoice's
  // billing block — a long seller/student line must push the row below it
  // down rather than being clipped or overlapping at a fixed offset.
  const colY = doc.y;
  const colWidth = 220;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('SOLD BY', LEFT, colY, { characterSpacing: 0.3 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b2f4f').text(input.sellerName, LEFT, colY + 14, { width: colWidth });
  const soldByY = colY + 14 + doc.heightOfString(input.sellerName, { width: colWidth }) + 4;
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text('support@rajyarank.com', LEFT, soldByY, { width: colWidth });

  const rightColX = LEFT + 275;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('BILLED TO', rightColX, colY, { characterSpacing: 0.3 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b2f4f').text(input.studentName, rightColX, colY + 14, { width: colWidth });
  let billToY = colY + 14 + doc.heightOfString(input.studentName, { width: colWidth }) + 4;
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  for (const line of [input.studentEmail, input.studentPhone]) {
    if (!line) continue;
    doc.text(line, rightColX, billToY, { width: colWidth });
    billToY += doc.heightOfString(line, { width: colWidth }) + 2;
  }

  doc.y = Math.max(soldByY + 14, billToY) + 8;
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(1);

  // ── Line item table ──
  const tableTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c');
  doc.text('DESCRIPTION', LEFT, tableTop, { characterSpacing: 0.3 });
  doc.text('AMOUNT', 400, tableTop, { width: 145, align: 'right', characterSpacing: 0.3 });
  doc.moveTo(LEFT, tableTop + 16).lineTo(RIGHT, tableTop + 16).strokeColor('#dbe5ed').stroke();
  doc.y = tableTop + 24;

  lineRow(doc, input.productTitle, rupees(input.amountMinor));
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(0.4);
  lineRow(doc, 'Total paid', rupees(input.amountMinor), true);
  doc.moveDown(1);

  if (input.providerPaymentId) {
    doc.font('Helvetica').fontSize(9).fillColor('#65798c').text(`Payment reference: ${input.providerPaymentId}`, LEFT);
    doc.moveDown(0.3);
  }

  doc.moveDown(1.2);
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(0.8);
  doc.fontSize(8).fillColor('#65798c').text(
    `System-generated receipt for a course purchase on RajyaRank. Questions? Write to support@rajyarank.com. Generated ${formatDate(new Date())}.`,
    LEFT,
    doc.y,
    { width: RIGHT - LEFT },
  );
  return collect(doc);
}
