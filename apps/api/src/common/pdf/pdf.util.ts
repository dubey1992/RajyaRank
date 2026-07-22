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

function header(doc: PDFKit.PDFDocument, title: string, number: string, dateLabel: string) {
  doc.fontSize(20).font('Helvetica-Bold').text('RajyaRank', { continued: true }).fontSize(10).font('Helvetica').text('  Government Exam Learning Platform');
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text(title);
  doc.fontSize(10).font('Helvetica').text(`${number}  ·  ${dateLabel}`);
  doc.moveDown(1);
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(1);
}

function lineRow(doc: PDFKit.PDFDocument, label: string, value: string, bold = false) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
  const y = doc.y;
  doc.text(label, 50, y);
  doc.text(value, 400, y, { width: 145, align: 'right' });
  doc.moveDown(0.6);
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
  doc.fontSize(9).fillColor('#65798c').text('Institution subscription billing  ·  institutions@rajyarank.in', LEFT);
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
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text('institutions@rajyarank.in', LEFT, colY + 30, { width: colWidth });

  const rightColX = LEFT + 275;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#65798c').text('BILLED TO', rightColX, colY, { characterSpacing: 0.3 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b2f4f').text(input.orgName, rightColX, colY + 14, { width: colWidth });
  let billToY = colY + 30;
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`Institution code: ${input.orgCode}`, rightColX, billToY, { width: colWidth });
  billToY += 14;
  if (input.billingContactName || input.billingContactEmail) {
    const contactLine = [input.billingContactName, input.billingContactEmail].filter(Boolean).join('  ·  ');
    doc.text(contactLine, rightColX, billToY, { width: colWidth });
    billToY += 14;
  }
  if (input.billingContactPhone) {
    doc.text(input.billingContactPhone, rightColX, billToY, { width: colWidth });
    billToY += 14;
  }

  doc.y = Math.max(colY + 30 + 14, billToY) + 10;
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
    `Plan includes:  up to ${input.maxActiveStudents.toLocaleString('en-IN')} active students  ·  ${input.maxStaffSeats} staff seats  ·  ${input.storageGb} GB storage`,
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
    `System-generated invoice for platform subscription billing. Questions? Write to institutions@rajyarank.in. Generated ${formatDate(new Date())}.`,
    LEFT,
    doc.y,
    { width: RIGHT - LEFT },
  );
  return collect(doc);
}

/** Student course-purchase receipt — issued by the platform (public sales) or
 *  on behalf of the owning institute (institute-audience sales). */
export async function renderOrderReceiptPdf(input: {
  receiptNumber: string;
  sellerName: string;
  studentName: string;
  productTitle: string;
  amountMinor: number;
  paidAt: Date;
  providerPaymentId: string | null;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'Payment Receipt', input.receiptNumber, `Paid ${input.paidAt.toISOString().slice(0, 10)}`);

  doc.font('Helvetica-Bold').fontSize(11).text('Seller');
  doc.font('Helvetica').fontSize(11).text(input.sellerName);
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(11).text('Student');
  doc.font('Helvetica').fontSize(11).text(input.studentName);
  doc.moveDown(1);

  lineRow(doc, input.productTitle, rupees(input.amountMinor));
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dbe5ed').stroke();
  doc.moveDown(0.4);
  lineRow(doc, 'Total paid', rupees(input.amountMinor), true);
  if (input.providerPaymentId) {
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#65798c').text(`Payment reference: ${input.providerPaymentId}`);
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#65798c').text('This is a system-generated receipt for a course purchase on RajyaRank.');
  return collect(doc);
}
