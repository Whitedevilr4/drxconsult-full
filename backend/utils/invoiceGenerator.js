const PDFDocument = require('pdfkit');

/**
 * Fee model:
 *   Base amount (B)      = what professional + platform split
 *   Professional fee     = 70% of B
 *   Platform fee         = 30% of B
 *   GST (18% on 30%)     = B × 0.054
 *   Total patient pays   = B × 1.054
 *
 *   Given paymentAmount (what patient paid):
 *     B                  = paymentAmount / 1.054
 *     Professional fee   = B × 0.70
 *     Platform fee       = B × 0.30
 *     GST                = B × 0.054
 *     Total              = B × 1.054  = paymentAmount
 *
 *   Example: B = ₹1000
 *     Professional fee   = ₹700
 *     Platform fee       = ₹300
 *     GST (18% on ₹300)  = ₹54
 *     Total              = ₹1054
 *
 *   Rounding: always ceil to nearest paisa (positive rounding).
 *   Any drift from rounding is added to professional fee so total stays exact.
 */
const ceil2 = (n) => Math.ceil(n * 100) / 100;

const calcBreakdown = (paymentAmount) => {
  const base           = paymentAmount / 1.054;
  const professionalFee = ceil2(base * 0.70);
  const platformFee     = ceil2(base * 0.30);
  const gst             = ceil2(base * 0.054);

  // Ensure rows sum exactly to paymentAmount (absorb rounding drift into professional fee)
  const rowSum = professionalFee + platformFee + gst;
  const drift  = parseFloat((paymentAmount - rowSum).toFixed(2));

  return {
    professionalFee : parseFloat((professionalFee + drift).toFixed(2)),
    platformFee,
    gst,
    total: paymentAmount
  };
};

const generateInvoicePDF = (booking, patientName, professionalName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const { professionalFee, platformFee, gst, total } = calcBreakdown(booking.paymentAmount || 0);

      const invoiceNo   = `INV-${booking._id.toString().slice(-8).toUpperCase()}`;
      const invoiceDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      const serviceLabel =
        booking.serviceType === 'prescription_review'      ? 'Prescription Review'      :
        booking.serviceType === 'doctor_consultation'       ? 'Doctor Consultation'       :
        booking.serviceType === 'nutritionist_consultation' ? 'Nutritionist Consultation' :
        'Full Consultation';

      const W = doc.page.width;

      // ── Header ────────────────────────────────────────────────────────────
      doc.rect(0, 0, W, 90).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold')
        .text('Drx Consult', 50, 22);
      doc.fontSize(10).font('Helvetica')
        .text('Patient Counselling Platform', 50, 52)
        .text('support@drxconsult.in  |  www.drxconsult.in', 50, 66);
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text('INVOICE', W - 130, 28, { width: 80, align: 'right' });
      doc.fontSize(9).font('Helvetica')
        .text(invoiceNo,   W - 130, 44, { width: 80, align: 'right' })
        .text(invoiceDate, W - 130, 58, { width: 80, align: 'right' });

      // ── Bill To / Professional ────────────────────────────────────────────
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, 110);
      doc.font('Helvetica').fillColor('#374151')
        .text(patientName, 50, 126)
        .text(`Booking ID: ${booking._id}`, 50, 141)
        .text(`Date: ${new Date(booking.slotDate).toLocaleDateString('en-IN')}  |  Time: ${booking.slotTime}`, 50, 156);

      doc.font('Helvetica-Bold').fillColor('#111827').text('Professional:', 350, 110);
      doc.font('Helvetica').fillColor('#374151')
        .text(professionalName, 350, 126)
        .text(`Service: ${serviceLabel}`, 350, 141)
        .text(`Payment ID: ${booking.paymentId || 'N/A'}`, 350, 156);

      // ── Divider ───────────────────────────────────────────────────────────
      doc.moveTo(50, 180).lineTo(W - 50, 180).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // ── Table Header ──────────────────────────────────────────────────────
      doc.rect(50, 192, W - 100, 24).fill('#f3f4f6');
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold')
        .text('Description', 60, 199)
        .text('Amount (₹)', W - 160, 199, { width: 100, align: 'right' });

      // ── Table Rows ────────────────────────────────────────────────────────
      let y = 228;
      const rowH = 30;

      const rows = [
        {
          label : `Professional Fee`,
          sub   : `${professionalName} — 70% of base amount`,
          amount: professionalFee.toFixed(2)
        },
        {
          label : 'Platform Service Fee',
          sub   : '30% of base amount (excl. GST)',
          amount: platformFee.toFixed(2)
        },
        {
          label : 'GST @ 18%',
          sub   : 'Applicable on platform service fee (18% of 30%)',
          amount: gst.toFixed(2)
        },
      ];

      rows.forEach((row, i) => {
        if (i % 2 === 1) doc.rect(50, y - 4, W - 100, rowH + 4).fill('#fafafa');
        doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text(row.label, 60, y);
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(row.sub, 60, y + 13);
        doc.fillColor('#374151').fontSize(10).font('Helvetica')
          .text(`₹${row.amount}`, W - 160, y + 6, { width: 100, align: 'right' });
        y += rowH + 6;
      });

      // ── Separator ─────────────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(W - 50, y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      y += 6;
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text(
          `Base amount: ₹${(professionalFee + platformFee).toFixed(2)}   |   GST (18% on platform fee ₹${platformFee.toFixed(2)}): ₹${gst.toFixed(2)}`,
          60, y, { width: W - 120 }
        );
      y += 18;

      // ── Total Row ─────────────────────────────────────────────────────────
      doc.rect(50, y, W - 100, 32).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('Total Amount Charged to Patient', 60, y + 10)
        .text(`₹${total.toFixed(2)}`, W - 160, y + 10, { width: 100, align: 'right' });
      y += 50;

      // ── Distribution summary ──────────────────────────────────────────────
      doc.rect(50, y, W - 100, 52).fill('#f0fdf4');
      doc.moveTo(50, y).lineTo(W - 50, y).strokeColor('#bbf7d0').lineWidth(1).stroke();
      doc.moveTo(50, y + 52).lineTo(W - 50, y + 52).stroke();
      doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold')
        .text('Payment Distribution', 60, y + 8);
      doc.font('Helvetica').fillColor('#374151').fontSize(9)
        .text(`Professional receives: ₹${professionalFee.toFixed(2)} (70%)`, 60, y + 22)
        .text(
          `Platform fee: ₹${platformFee.toFixed(2)} (30%)   |   GST collected: ₹${gst.toFixed(2)} (18% on platform fee)`,
          60, y + 36
        );
      y += 68;

      // ── Note ─────────────────────────────────────────────────────────────
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text(
          'This is a computer-generated invoice. GST @ 18% is levied on the platform service fee (30% of base). ' +
          'The professional receives 70% of the base amount. All amounts are in Indian Rupees (INR). ' +
          'Rounding applied upward to the nearest paisa.',
          50, y, { width: W - 100 }
        );

      // ── Footer ────────────────────────────────────────────────────────────
      doc.rect(0, doc.page.height - 40, W, 40).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
        .text(
          'Drx Consult  |  support@drxconsult.in  |  This invoice is system generated and does not require a signature.',
          50, doc.page.height - 26, { width: W - 100, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
