const PDFDocument = require('pdfkit');

/**
 * Generate a booking invoice PDF as a Buffer.
 * 
 * Price breakdown logic:
 *   Professional Fee  = paymentAmount (what patient paid)
 *   Taxable Amount    = 30% of professional fee (platform service charge)
 *   GST (18%)         = 18% of taxable amount
 *   Total             = professional fee (already inclusive, displayed for clarity)
 *
 * Example: paid ₹105.4
 *   Professional Fee  = ₹105.4
 *   Taxable Amount    = ₹31.62  (30% of 105.4)
 *   GST 18%           = ₹5.69   (18% of 31.62)
 *   Total             = ₹105.4
 */
const generateInvoicePDF = (booking, patientName, professionalName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const paymentAmount = booking.paymentAmount || 0;
      const taxableAmount = parseFloat((paymentAmount * 0.30).toFixed(2));
      const gst = parseFloat((taxableAmount * 0.18).toFixed(2));
      const total = paymentAmount;

      const invoiceNo = `INV-${booking._id.toString().slice(-8).toUpperCase()}`;
      const invoiceDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      const serviceLabel = booking.serviceType === 'prescription_review'
        ? 'Prescription Review'
        : booking.serviceType === 'doctor_consultation'
        ? 'Doctor Consultation'
        : booking.serviceType === 'nutritionist_consultation'
        ? 'Nutritionist Consultation'
        : 'Full Consultation';

      // ── Header / Letterhead ──────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill('#1a56db');

      doc.fillColor('#ffffff')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text('Drx Consult', 50, 22);

      doc.fontSize(10)
        .font('Helvetica')
        .text('Patient Counselling Platform', 50, 52)
        .text('support@drxconsult.in  |  www.drxconsult.in', 50, 66);

      doc.fillColor('#ffffff')
        .fontSize(10)
        .text('INVOICE', doc.page.width - 130, 30, { width: 80, align: 'right' })
        .fontSize(9)
        .text(invoiceNo, doc.page.width - 130, 46, { width: 80, align: 'right' })
        .text(invoiceDate, doc.page.width - 130, 60, { width: 80, align: 'right' });

      // ── Bill To / Booking Info ───────────────────────────────────────────
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

      // ── Divider ──────────────────────────────────────────────────────────
      doc.moveTo(50, 180).lineTo(doc.page.width - 50, 180).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // ── Table Header ─────────────────────────────────────────────────────
      doc.rect(50, 192, doc.page.width - 100, 24).fill('#f3f4f6');
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold')
        .text('Description', 60, 199)
        .text('Amount (₹)', doc.page.width - 160, 199, { width: 100, align: 'right' });

      // ── Table Rows ───────────────────────────────────────────────────────
      let y = 228;
      const rowHeight = 26;

      const rows = [
        { label: `Professional Fee (${serviceLabel})`, amount: paymentAmount.toFixed(2) },
        { label: 'Taxable Amount (30% of Professional Fee)', amount: taxableAmount.toFixed(2) },
        { label: 'GST @ 18% (on Taxable Amount)', amount: gst.toFixed(2) },
      ];

      rows.forEach((row, i) => {
        if (i % 2 === 1) {
          doc.rect(50, y - 4, doc.page.width - 100, rowHeight).fill('#fafafa');
        }
        doc.fillColor('#374151').fontSize(10).font('Helvetica')
          .text(row.label, 60, y)
          .text(`₹${row.amount}`, doc.page.width - 160, y, { width: 100, align: 'right' });
        y += rowHeight;
      });

      // ── Total Row ────────────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      y += 8;
      doc.rect(50, y, doc.page.width - 100, 30).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
        .text('Total Amount Paid', 60, y + 9)
        .text(`₹${total.toFixed(2)}`, doc.page.width - 160, y + 9, { width: 100, align: 'right' });

      // ── Note ─────────────────────────────────────────────────────────────
      y += 50;
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text(
          'Note: The taxable amount represents the platform service charge (30% of professional fee). GST at 18% is applicable on the taxable amount. This is a computer-generated invoice.',
          50, y, { width: doc.page.width - 100 }
        );

      // ── Footer ───────────────────────────────────────────────────────────
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#1a56db');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
        .text(
          'Drx Consult  |  support@drxconsult.in  |  This invoice is system generated and does not require a signature.',
          50, doc.page.height - 26, { width: doc.page.width - 100, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF };
