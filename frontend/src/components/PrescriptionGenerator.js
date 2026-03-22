import { useState, useRef } from 'react'

export default function PrescriptionGenerator({ doctor, user, onClose }) {
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    sex: '',
    weight: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '', instructions: '' }],
    notes: ''
  })
  const [generating, setGenerating] = useState(false)
  const prescriptionRef = useRef(null)

  const addMedicine = () => {
    setForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', duration: '', instructions: '' }]
    }))
  }

  const removeMedicine = (index) => {
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }))
  }

  const updateMedicine = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }))
  }

  const generatePDF = async () => {
    if (!form.patientName || !form.age || !form.sex || !form.diagnosis) {
      alert('Please fill in all required fields (Patient Name, Age, Sex, Diagnosis)')
      return
    }
    if (form.medicines.some(m => !m.name)) {
      alert('Please fill in all medicine names')
      return
    }

    setGenerating(true)

    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = 210
      const pageH = 297
      const margin = 15
      const contentW = pageW - margin * 2
      let y = margin

      // ── Header / Letterhead ──────────────────────────────────────────
      // Blue top bar
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageW, 28, 'F')

      // Company name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('💊 DRx Consult', margin, 12)

      // Tagline
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Your Trusted Healthcare Consultation Platform', margin, 19)

      // Right side contact
      doc.setFontSize(8)
      doc.text('www.drxconsult.com', pageW - margin, 12, { align: 'right' })
      doc.text('support@drxconsult.com', pageW - margin, 18, { align: 'right' })

      y = 35

      // ── Doctor Info Block ────────────────────────────────────────────
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y, contentW, 32, 3, 3, 'F')
      doc.setDrawColor(147, 197, 253)
      doc.roundedRect(margin, y, contentW, 32, 3, 3, 'S')

      doc.setTextColor(30, 58, 138)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(`Dr. ${user?.name || 'Doctor'}`, margin + 5, y + 9)

      doc.setTextColor(55, 65, 81)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`${doctor?.qualification || ''} | ${doctor?.specialization || ''}`, margin + 5, y + 16)
      doc.text(`Experience: ${doctor?.experience || ''} years`, margin + 5, y + 22)
      doc.text(`Reg. No: ${doctor?.licenseNumber || 'N/A'}`, margin + 5, y + 28)

      // Date on right
      doc.setTextColor(107, 114, 128)
      doc.setFontSize(9)
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.text(`Date: ${dateStr}`, pageW - margin - 5, y + 9, { align: 'right' })

      y += 38

      // ── PRESCRIPTION title ───────────────────────────────────────────
      doc.setFillColor(37, 99, 235)
      doc.rect(margin, y, contentW, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PRESCRIPTION', pageW / 2, y + 5.5, { align: 'center' })
      y += 13

      // ── Patient Info ─────────────────────────────────────────────────
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(margin, y, contentW, 22, 2, 2, 'F')
      doc.setDrawColor(209, 213, 219)
      doc.roundedRect(margin, y, contentW, 22, 2, 2, 'S')

      doc.setTextColor(55, 65, 81)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('PATIENT DETAILS', margin + 4, y + 6)

      doc.setFont('helvetica', 'normal')
      const col1x = margin + 4
      const col2x = margin + contentW / 2

      doc.text(`Name: ${form.patientName}`, col1x, y + 13)
      doc.text(`Age: ${form.age} yrs  |  Sex: ${form.sex}`, col1x, y + 19)
      doc.text(`Weight: ${form.weight ? form.weight + ' kg' : 'N/A'}`, col2x, y + 13)

      y += 27

      // ── Diagnosis ────────────────────────────────────────────────────
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F')
      doc.setDrawColor(253, 230, 138)
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'S')

      doc.setTextColor(120, 53, 15)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Diagnosis:', margin + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.text(form.diagnosis, margin + 30, y + 6)

      y += 19

      // ── Medicines ────────────────────────────────────────────────────
      doc.setTextColor(30, 58, 138)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Rx  Medicines Prescribed', margin, y + 5)
      y += 10

      // Table header
      doc.setFillColor(37, 99, 235)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const cols = [margin + 2, margin + 60, margin + 100, margin + 130]
      doc.text('#', cols[0], y + 5)
      doc.text('Medicine Name', cols[0] + 6, y + 5)
      doc.text('Dosage', cols[1], y + 5)
      doc.text('Duration', cols[2], y + 5)
      doc.text('Instructions', cols[3], y + 5)
      y += 7

      form.medicines.forEach((med, idx) => {
        const rowBg = idx % 2 === 0 ? [255, 255, 255] : [243, 244, 246]
        doc.setFillColor(...rowBg)
        doc.rect(margin, y, contentW, 8, 'F')
        doc.setDrawColor(229, 231, 235)
        doc.rect(margin, y, contentW, 8, 'S')

        doc.setTextColor(55, 65, 81)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${idx + 1}.`, cols[0], y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.text(med.name || '-', cols[0] + 6, y + 5.5)
        doc.setFont('helvetica', 'normal')
        doc.text(med.dosage || '-', cols[1], y + 5.5)
        doc.text(med.duration || '-', cols[2], y + 5.5)
        doc.text(med.instructions || '-', cols[3], y + 5.5)
        y += 8
      })

      y += 6

      // ── Notes ────────────────────────────────────────────────────────
      if (form.notes) {
        doc.setFillColor(240, 253, 244)
        doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F')
        doc.setDrawColor(167, 243, 208)
        doc.roundedRect(margin, y, contentW, 16, 2, 2, 'S')
        doc.setTextColor(20, 83, 45)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Additional Notes:', margin + 4, y + 6)
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(form.notes, contentW - 8)
        doc.text(noteLines, margin + 4, y + 12)
        y += 20
      }

      // ── Disclaimer ───────────────────────────────────────────────────
      y = Math.max(y + 10, pageH - 55)

      doc.setFillColor(254, 242, 242)
      doc.roundedRect(margin, y, contentW, 22, 2, 2, 'F')
      doc.setDrawColor(252, 165, 165)
      doc.roundedRect(margin, y, contentW, 22, 2, 2, 'S')

      doc.setTextColor(153, 27, 27)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('DISCLAIMER', margin + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      const disclaimer = 'This prescription is issued via DRx Consult, an online healthcare consultation platform. It is valid only for the patient named above and should not be shared or reused. This prescription is for informational purposes and does not replace in-person medical advice. Please consult a pharmacist before dispensing. DRx Consult is not liable for any misuse of this document.'
      const disclaimerLines = doc.splitTextToSize(disclaimer, contentW - 8)
      doc.text(disclaimerLines, margin + 4, y + 12)

      y += 27

      // ── Signature ────────────────────────────────────────────────────
      doc.setDrawColor(37, 99, 235)
      doc.setLineWidth(0.5)
      doc.line(pageW - margin - 55, y, pageW - margin, y)

      doc.setTextColor(30, 58, 138)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`Dr. ${user?.name || 'Doctor'}`, pageW - margin - 55, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(`Reg. No: ${doctor?.licenseNumber || 'N/A'}`, pageW - margin - 55, y + 10)
      doc.text('Authorised Signatory', pageW - margin - 55, y + 15)

      // ── Footer ───────────────────────────────────────────────────────
      doc.setFillColor(37, 99, 235)
      doc.rect(0, pageH - 10, pageW, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('DRx Consult | www.drxconsult.com | Confidential Medical Document', pageW / 2, pageH - 4, { align: 'center' })

      // Save
      const fileName = `Prescription_${form.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Generate Prescription</h2>
            <p className="text-blue-100 text-sm">Dr. {user?.name} · Reg. {doctor?.licenseNumber}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Doctor info (prefilled, read-only) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Doctor Info (Prefilled)</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <span><span className="font-medium">Name:</span> Dr. {user?.name}</span>
              <span><span className="font-medium">Reg. No:</span> {doctor?.licenseNumber}</span>
              <span><span className="font-medium">Qualification:</span> {doctor?.qualification}</span>
              <span><span className="font-medium">Specialization:</span> {doctor?.specialization}</span>
            </div>
          </div>

          {/* Patient Details */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Patient Details <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Patient Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.patientName}
                  onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Age *</label>
                <input
                  type="number"
                  placeholder="Years"
                  value={form.age}
                  onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sex *</label>
                <select
                  value={form.sex}
                  onChange={e => setForm(p => ({ ...p, sex: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Weight (kg)</label>
                <input
                  type="number"
                  placeholder="kg"
                  value={form.weight}
                  onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Diagnosis *</label>
                <input
                  type="text"
                  placeholder="e.g. Viral Fever"
                  value={form.diagnosis}
                  onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Medicines <span className="text-red-500">*</span></p>
              <button
                onClick={addMedicine}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-3">
              {form.medicines.map((med, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Medicine {idx + 1}</span>
                    {form.medicines.length > 1 && (
                      <button onClick={() => removeMedicine(idx)} className="text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Medicine name *"
                        value={med.name}
                        onChange={e => updateMedicine(idx, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={med.dosage}
                      onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 days)"
                      value={med.duration}
                      onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Instructions (e.g. After meals, twice daily)"
                        value={med.instructions}
                        onChange={e => updateMedicine(idx, 'instructions', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Additional Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional instructions or follow-up advice..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500">PDF will download automatically</p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={generatePDF}
              disabled={generating}
              className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate & Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
