import { useState } from 'react';
import Link from 'next/link';

export default function PaymentDisclaimer({ onAccept, onCancel, amount, serviceName }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h2 className="text-xl font-bold">Important Disclaimer</h2>
                <p className="text-sm text-blue-100">Please read carefully before proceeding</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Service and Amount */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">Service</p>
                <p className="text-lg font-bold text-blue-900">{serviceName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-800 font-medium">Amount</p>
                <p className="text-2xl font-bold text-blue-900">₹{amount}</p>
              </div>
            </div>
          </div>

          {/* Disclaimer Text */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-5 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 mb-3">Platform Disclaimer</h3>
                <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
                  <p>
                    <strong className="text-yellow-900">DRX Consult</strong> is a technology platform and <strong>does not provide any medical, pharmacy, hospital, or ambulance services</strong>. All healthcare services are delivered solely by independent healthcare providers listed on the platform.
                  </p>
                  
                  <p>
                    <strong className="text-yellow-900">DRX Consult shall not be responsible or liable for:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Medical advice or treatment decisions</li>
                    <li>Admission outcomes or results</li>
                    <li>Delays in service delivery</li>
                    <li>Complications arising from treatment</li>
                    <li>Service performance of any provider</li>
                  </ul>

                  <p className="bg-white p-3 rounded border border-yellow-200">
                    <strong className="text-yellow-900">Refund Policy:</strong> If a healthcare provider declines or fails to deliver the requested service after payment, the platform facilitation fee will be refunded to the original payment method in accordance with our Refund Policy.
                  </p>

                  <p className="text-xs text-gray-600 italic">
                    For complete details, please review our{' '}
                    <Link href="/terms" className="text-blue-600 hover:underline font-semibold">
                      Terms and Conditions
                    </Link>
                    {' '}and{' '}
                    <Link href="/refund-policy" className="text-blue-600 hover:underline font-semibold">
                      Refund Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkbox Agreement */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 flex-1">
                I have read and understood the disclaimer above. I acknowledge that DRX Consult is a technology platform only and accept the{' '}
                <Link href="/terms" className="text-blue-600 hover:underline font-semibold">
                  Terms and Conditions
                </Link>
                {' '}and{' '}
                <Link href="/refund-policy" className="text-blue-600 hover:underline font-semibold">
                  Refund Policy
                </Link>
                .
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!isChecked}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              isChecked
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isChecked ? 'Accept & Proceed to Payment' : 'Please Accept Terms'}
          </button>
        </div>
      </div>
    </div>
  );
}
