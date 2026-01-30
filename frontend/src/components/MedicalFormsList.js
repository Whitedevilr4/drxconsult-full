import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MedicalFormsList = ({ refreshTrigger }) => {
  const [medicalForms, setMedicalForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(null);

  useEffect(() => {
    fetchMedicalForms();
  }, [refreshTrigger]);

  const fetchMedicalForms = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/medical-forms/my-forms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMedicalForms(response.data);
    } catch (error) {
      console.error('Error fetching medical forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'assigned':
        return 'Under Review';
      case 'completed':
        return 'Ready for Payment';
      case 'paid':
        return 'Completed';
      default:
        return status;
    }
  };

  const handlePayment = async (formId) => {
    setPaymentProcessing(formId);
    
    try {
      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        toast.error('Payment system is loading. Please try again in a moment.');
        setPaymentProcessing(null);
        return;
      }

      // Create Razorpay order
      const orderResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/payments/medical-form/create-order`, {
        medicalFormId: formId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const order = orderResponse.data;

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount_due,
        currency: order.currency,
        name: 'DrX Consult',
        description: 'Medical Form Result Payment',
        order_id: order.id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/payments/medical-form/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              medicalFormId: formId
            }, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (verifyResponse.data.success) {
              toast.success('Payment successful! You can now download your result.');
              fetchMedicalForms(); // Refresh the list
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setPaymentProcessing(null);
          }
        },
        prefill: {
          name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : '',
          email: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '',
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(null);
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setPaymentProcessing(null);
      });
      
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
      setPaymentProcessing(null);
    }
  };

  const handleDownload = (resultUrl, formId) => {
    if (resultUrl) {
      window.open(resultUrl, '_blank');
    } else {
      toast.warning('Result not available yet');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">My Medical Forms</h3>
      
      {medicalForms.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No medical forms</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by submitting your first medical form.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medicalForms.map((form) => (
            <div key={form._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{form.patientName}</h4>
                  <p className="text-sm text-gray-500">
                    Age: {form.age} | Sex: {form.sex}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(form.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                  {getStatusText(form.status)}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-700">
                  <strong>Prescription Details:</strong> {form.prescriptionDetails}
                </p>
                {form.additionalNotes && (
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Additional Notes:</strong> {form.additionalNotes}
                  </p>
                )}
              </div>

              {form.assignedTo && (
                <div className="mb-3 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Assigned to:</strong> {form.assignedTo.name} ({form.assignedType})
                  </p>
                  {form.assignedAt && (
                    <p className="text-sm text-blue-600">
                      Assigned on: {new Date(form.assignedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {form.status === 'completed' && (
                <div className="mb-3 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Result Ready!</strong> Complete payment to download your result.
                  </p>
                  {form.resultNotes && (
                    <p className="text-sm text-green-700 mt-1">
                      <strong>Notes:</strong> {form.resultNotes}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-green-600">
                      Payment Required: ₹{form.paymentAmount}
                    </p>
                    <div className="flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Secure Payment</span>
                    </div>
                  </div>
                </div>
              )}

              {form.status === 'paid' && (
                <div className="mb-3 p-3 bg-purple-50 rounded-md">
                  <p className="text-sm text-purple-800">
                    <strong>Payment Completed!</strong> Your result is ready for download.
                  </p>
                  {form.resultNotes && (
                    <p className="text-sm text-purple-700 mt-1">
                      <strong>Notes:</strong> {form.resultNotes}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-purple-600">
                      Paid: ₹{form.paymentAmount} on {new Date(form.paidAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center text-purple-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {form.prescriptionUrl && (
                    <button
                      onClick={() => window.open(form.prescriptionUrl, '_blank')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Prescription
                    </button>
                  )}
                </div>

                <div className="flex space-x-2">
                  {form.status === 'completed' && (
                    <button
                      onClick={() => handlePayment(form._id)}
                      disabled={paymentProcessing === form._id}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentProcessing === form._id ? 'Processing...' : `Pay ₹${form.paymentAmount}`}
                    </button>
                  )}

                  {form.status === 'paid' && form.resultPdfUrl && (
                    <button
                      onClick={() => handleDownload(form.resultPdfUrl, form._id)}
                      className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download Result</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicalFormsList;