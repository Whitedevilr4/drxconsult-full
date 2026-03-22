import { useState, useRef } from 'react'

export default function PrescriptionGenerator({ doctor, user, onClose, onSignatureUpdate }) {
  const [form, setForm] = useState({
    patientName: '', age: '', sex: '', weight: '',
    diagnosis: '', medicines: [{ name: '', dosage: '', duration: '', instructions: '' }], notes: ''
  })
  const [generating, setGenerating] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState(doctor?.signatureUrl || '')
  const signatureInputRef = useRef(null)

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSignature(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('signature', file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/signature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setSignatureUrl(data.signatureUrl)
        onSignatureUpdate?.(data.signatureUrl)
      } else {
        alert(data.message || 'Upload failed')
      }
    } catch {
      alert('Failed to upload signature')
    } finally {
      setUploadingSignature(false)
    }
  }

  const handleRemoveSignature = async () => {
    if (!confirm('Remove your saved signature?')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/signature`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setSignatureUrl('')
      onSignatureUpdate?.('')
    } catch {
      alert('Failed to remove signature')
    }
  }

  const addMedicine = () => setForm(p => ({ ...p, medicines: [...p.medicines, { name: '', dosage: '', duration: '', instructions: '' }] }))
  const removeMedicine = (i) => setForm(p => ({ ...p, medicines: p.medicines.filter((_, idx) => idx !== i) }))
  const updateMedicine = (i, field, val) => setForm(p => ({ ...p, medicines: p.medicines.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }))

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
      const pageW = 210, pageH = 297, margin = 15
      const contentW = pageW - margin * 2
      let y = margin

      // Pre-load signature image as base64 before drawing
      let sigBase64 = null
      if (signatureUrl) {
        try {
          const imgRes = await fetch(signatureUrl)
          const blob = await imgRes.blob()
          sigBase64 = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch { /* skip signature if fetch fails */ }
      }

      // ── Header ───────────────────────────────────────────────────────
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageW, 26, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('DRx Consult', margin, 11)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Your Trusted Healthcare Consultation Platform', margin, 18)
      doc.setFontSize(8)
      doc.text('www.drxconsult.com', pageW - margin, 11, { align: 'right' })
      doc.text('support@drxconsult.com', pageW - margin, 17, { align: 'right' })
      y = 32

      // ── Doctor Info ──────────────────────────────────────────────────
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F')
      doc.setDrawColor(147, 197, 253)
      doc.roundedRect(margin, y, contentW, 30, 3, 3, 'S')
      doc.setTextColor(30, 58, 138)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Dr. ${user?.name || 'Doctor'}`, margin + 5, y + 8)
      doc.setTextColor(55, 65, 81)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.text(`${doctor?.qualification || ''} | ${doctor?.specialization || ''}`, margin + 5, y + 15)
      doc.text(`Experience: ${doctor?.experience || ''} yrs  |  Reg. No: ${doctor?.licenseNumber || 'N/A'}`, margin + 5, y + 22)
      doc.setTextColor(107, 114, 128)
      doc.setFontSize(8.5)
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.text(`Date: ${dateStr}`, pageW - margin - 5, y + 8, { align: 'right' })
      y += 36

      // ── PRESCRIPTION banner ──────────────────────────────────────────
      doc.setFillColor(37, 99, 235)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('PRESCRIPTION', pageW / 2, y + 5, { align: 'center' })
      y += 12

      // ── Patient Details ──────────────────────────────────────────────
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(margin, y, contentW, 20, 2, 2, 'F')
      doc.setDrawColor(209, 213, 219)
      doc.roundedRect(margin, y, contentW, 20, 2, 2, 'S')
      doc.setTextColor(55, 65, 81)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('PATIENT DETAILS', margin + 4, y + 5)
      doc.setFont('helvetica', 'normal')
      const col2x = margin + contentW / 2
      doc.text(`Name: ${form.patientName}`, margin + 4, y + 12)
      doc.text(`Age: ${form.age} yrs  |  Sex: ${form.sex}`, margin + 4, y + 18)
      doc.text(`Weight: ${form.weight ? form.weight + ' kg' : 'N/A'}`, col2x, y + 12)
      y += 25

      // ── Diagnosis ────────────────────────────────────────────────────
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F')
      doc.setDrawColor(253, 230, 138)
      doc.roundedRect(margin, y, contentW, 12, 2, 2, 'S')
      doc.setTextColor(120, 53, 15)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.text('Diagnosis:', margin + 4, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.text(form.diagnosis, margin + 28, y + 8)
      y += 17

      // ── Medicines Table ──────────────────────────────────────────────
      doc.setTextColor(30, 58, 138)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Rx  Medicines Prescribed', margin, y + 4)
      y += 9

      // Table header
      doc.setFillColor(37, 99, 235)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      const c = [margin + 2, margin + 8, margin + 65, margin + 100, margin + 130]
      doc.text('#', c[0], y + 5)
      doc.text('Medicine Name', c[1], y + 5)
      doc.text('Dosage', c[2], y + 5)
      doc.text('Duration', c[3], y + 5)
      doc.text('Instructions', c[4], y + 5)
      y += 7

      form.medicines.forEach((med, idx) => {
        doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] : [243, 244, 246]))
        doc.rect(margin, y, contentW, 8, 'F')
        doc.setDrawColor(229, 231, 235)
        doc.rect(margin, y, contentW, 8, 'S')
        doc.setTextColor(55, 65, 81)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`${idx + 1}.`, c[0], y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.text(med.name || '-', c[1], y + 5.5)
        doc.setFont('helvetica', 'normal')
        doc.text(med.dosage || '-', c[2], y + 5.5)
        doc.text(med.duration || '-', c[3], y + 5.5)
        doc.text(med.instructions || '-', c[4], y + 5.5)
        y += 8
      })
      y += 5

      // ── Notes ────────────────────────────────────────────────────────
      if (form.notes) {
        doc.setFillColor(240, 253, 244)
        doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F')
        doc.setDrawColor(167, 243, 208)
        doc.roundedRect(margin, y, contentW, 16, 2, 2, 'S')
        doc.setTextColor(20, 83, 45)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.text('Additional Notes:', margin + 4, y + 6)
        doc.setFont('helvetica', 'normal')
        doc.text(doc.splitTextToSize(form.notes, contentW - 8), margin + 4, y + 12)
        y += 20
      }

      // ── Signature + Disclaimer (fixed at bottom) ─────────────────────
      // Reserve space: disclaimer(22) + gap(4) + sig area(22) + footer(10) = 58
      const bottomStart = pageH - 68

      // If content overflows into bottom zone, just push y down (content already drawn)
      y = Math.max(y + 6, bottomStart)

      // Signature block (right side)
      const sigX = pageW - margin - 60
      const sigBoxTop = y

      if (sigBase64) {
        // Draw signature image above the line
        doc.addImage(sigBase64, 'JPEG', sigX, sigBoxTop, 60, 16)
        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(0.4)
        doc.line(sigX, sigBoxTop + 17, sigX + 60, sigBoxTop + 17)
      } else {
        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(0.4)
        doc.line(sigX, sigBoxTop + 17, sigX + 60, sigBoxTop + 17)
      }

      doc.setTextColor(30, 58, 138)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`Dr. ${user?.name || 'Doctor'}`, sigX, sigBoxTop + 22)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(107, 114, 128)
      doc.text(`Reg. No: ${doctor?.licenseNumber || 'N/A'}`, sigX, sigBoxTop + 27)
      doc.text('Authorised Signatory', sigX, sigBoxTop + 32)

      // Disclaimer below signature
      const discTop = sigBoxTop + 36
      doc.setFillColor(254, 242, 242)
      doc.roundedRect(margin, discTop, contentW, 20, 2, 2, 'F')
      doc.setDrawColor(252, 165, 165)
      doc.roundedRect(margin, discTop, contentW, 20, 2, 2, 'S')
      doc.setTextColor(153, 27, 27)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('DISCLAIMER', margin + 4, discTop + 5)
      doc.setFont('helvetica', 'normal')
      const disclaimer = 'This prescription is issued via DRx Consult. It is valid only for the patient named above and should not be shared or reused. This does not replace in-person medical advice. Please consult a pharmacist before dispensing.'
      doc.text(doc.splitTextToSize(disclaimer, contentW - 8), margin + 4, discTop + 10)

      // ── Footer ───────────────────────────────────────────────────────
      doc.setFillColor(37, 99, 235)
      doc.rect(0, pageH - 10, pageW, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('DRx Consult | www.drxconsult.com | Confidential Medical Document', pageW / 2, pageH - 4, { align: 'center' })

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
          {/* Doctor info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Doctor Info (Prefilled)</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <span><span className="font-medium">Name:</span> Dr. {user?.name}</span>
              <span><span className="font-medium">Reg. No:</span> {doctor?.licenseNumber}</span>
              <span><span className="font-medium">Qualification:</span> {doctor?.qualification}</span>
              <span><span className="font-medium">Specialization:</span> {doctor?.specialization}</span>
            </div>
          </div>

          {/* Signature */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 uppercase">Doctor Signature</p>
              {signatureUrl && (
                <button onClick={handleRemoveSignature} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
            {signatureUrl ? (
              <div className="flex items-center gap-3">
                <img src={signatureUrl} alt="Signature" className="h-12 object-contain border border-gray-200 rounded bg-white px-2" />
                <button onClick={() => signatureInputRef.current?.click()} className="text-xs text-blue-600 hover:underline">Replace</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-500 flex-1">No signature yet. Upload once — it will appear on all prescriptions.</p>
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadingSignature}
                  className="shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingSignature ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}
            <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
          </div>

          {/* Patient Details */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Patient Details <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Patient Name *</label>
                <input type="text" placeholder="Full name" value={form.patientName}
                  onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Age *</label>
                <input type="number" placeholder="Years" value={form.age}
                  onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sex *</label>
                <select value={form.sex} onChange={e => setForm(p => ({ ...p, sex: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Weight (kg)</label>
                <input type="number" placeholder="kg" value={form.weight}
                  onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Diagnosis *</label>
                <input type="text" placeholder="e.g. Viral Fever" value={form.diagnosis}
                  onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Medicines <span className="text-red-500">*</span></p>
              <button onClick={addMedicine}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Medicine
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
                      <input type="text" placeholder="Medicine name *" value={med.name}
                        onChange={e => updateMedicine(idx, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <input type="text" placeholder="Dosage (e.g. 500mg)" value={med.dosage}
                      onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="Duration (e.g. 5 days)" value={med.duration}
                      onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="col-span-2">
                      <input type="text" placeholder="Instructions (e.g. After meals, twice daily)" value={med.instructions}
                        onChange={e => updateMedicine(idx, 'instructions', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Additional Notes</label>
            <textarea rows={2} placeholder="Any additional instructions or follow-up advice..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500">PDF will download automatically</p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button onClick={generatePDF} disabled={generating}
              className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate & Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
