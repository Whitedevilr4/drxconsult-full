import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import PaymentDisclaimer from '@/components/PaymentDisclaimer';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function SubscriptionPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showPaymentDisclaimer, setShowPaymentDisclaimer] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(null);

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  const fetchPlansAndSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [plansRes, subscriptionRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/plans`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/current`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setPlans(plansRes.data.plans);
      setCurrentSubscription(subscriptionRes.data.subscription);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType, billingCycle) => {
    // Show disclaimer first
    setPendingSubscription({ planType, billingCycle, isUpgrade: false });
    setShowPaymentDisclaimer(true);
  };

  const proceedWithSubscription = async () => {
    const { planType, billingCycle, isUpgrade } = pendingSubscription;
    setShowPaymentDisclaimer(false);
    
    try {
      setSubscribing(true);
      const token = localStorage.getItem('token');
      
      // Check if user is test user (free subscription)
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      const isTestUser = user.email === 'user' || user.email === 'admin';

      if (isTestUser) {
        // Free subscription for test users
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/create`,
          { 
            planType, 
            billingCycle,
            paymentId: 'FREE_TEST_USER',
            orderId: 'TEST_ORDER'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success('Subscription created successfully! (Free for test users)');
        setCurrentSubscription(res.data.subscription);
        setSubscribing(false);
        setPendingSubscription(null);
        return;
      }
      
      // Get plan details for payment
      const planConfig = plans[planType][billingCycle];
      const planInfo = plans[planType];
      const amount = planConfig.price;
      
      // Create payment order
      const orderRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/create-order`,
        { amount, currency: 'INR' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check if Razorpay is loaded
      let razorpayLoaded = typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined';
      if (!razorpayLoaded) {
        // Wait for Razorpay to load
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
            razorpayLoaded = true;
            break;
          }
        }
      }
      
      if (!razorpayLoaded) {
        toast.error('Payment system failed to load. Please refresh the page and try again.');
        setSubscribing(false);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        order_id: orderRes.data.id,
        name: 'DrX Consult',
        description: `${planInfo.name} - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        handler: async (response) => {
          try {
            // Create subscription after successful payment
            const res = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/create`,
              { 
                planType, 
                billingCycle,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Subscription created successfully!');
            setCurrentSubscription(res.data.subscription);
            setPendingSubscription(null);
          } catch (subscriptionErr) {
            console.error('Subscription creation error:', subscriptionErr);
            toast.error('Payment successful but subscription creation failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setSubscribing(false);
            setPendingSubscription(null);
          }
        },
        theme: {
          color: '#2563eb'
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          toast.error('Payment failed: ' + response.error.description);
          setSubscribing(false);
        });
        razorpay.open();
      } catch (razorpayErr) {
        console.error('Razorpay initialization error:', razorpayErr);
        toast.error('Payment system error: ' + razorpayErr.message);
        setSubscribing(false);
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      toast.error(err.response?.data?.message || 'Failed to create subscription');
      setSubscribing(false);
      setPendingSubscription(null);
    }
  };

  const handleUpgrade = async (planType, billingCycle) => {
    // Show disclaimer first
    setPendingSubscription({ planType, billingCycle, isUpgrade: true });
    setShowPaymentDisclaimer(true);
  };

  const proceedWithUpgrade = async () => {
    const { planType, billingCycle } = pendingSubscription;
    setShowPaymentDisclaimer(false);
    
    try {
      setSubscribing(true);
      const token = localStorage.getItem('token');
      
      // Get plan details for payment
      const planConfig = plans[planType][billingCycle];
      const planInfo = plans[planType];
      const amount = planConfig.price;
      
      // Create payment order
      const orderRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/create-order`,
        { amount, currency: 'INR' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Check if Razorpay is loaded
      let razorpayLoaded = typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined';
      if (!razorpayLoaded) {
        // Wait for Razorpay to load
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
            razorpayLoaded = true;
            break;
          }
        }
      }
      
      if (!razorpayLoaded) {
        toast.error('Payment system failed to load. Please refresh the page and try again.');
        setSubscribing(false);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        order_id: orderRes.data.id,
        name: 'DrX Consult',
        description: `Upgrade to ${planInfo.name} - ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        handler: async (response) => {
          try {
            // Update subscription after successful payment
            const res = await axios.put(
              `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/update`,
              { 
                planType, 
                billingCycle,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Subscription updated successfully!');
            setCurrentSubscription(res.data.subscription);
            setPendingSubscription(null);
          } catch (subscriptionErr) {
            console.error('Subscription update error:', subscriptionErr);
            toast.error('Payment successful but subscription update failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setSubscribing(false);
            setPendingSubscription(null);
          }
        },
        theme: {
          color: '#2563eb'
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          toast.error('Payment failed: ' + response.error.description);
          setSubscribing(false);
        });
        razorpay.open();
      } catch (razorpayErr) {
        console.error('Razorpay initialization error:', razorpayErr);
        toast.error('Payment system error: ' + razorpayErr.message);
        setSubscribing(false);
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      toast.error(err.response?.data?.message || 'Failed to update subscription');
      setSubscribing(false);
      setPendingSubscription(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Subscription cancelled successfully');
      setCurrentSubscription(null);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🔹 DRXCONSULT SUBSCRIPTION PLANS
            </h1>
            <p className="text-xl text-gray-600">
              Choose the perfect plan for your healthcare needs
            </p>
          </div>

          {/* Current Subscription Status */}
          {currentSubscription && (
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">
                      Current Plan: {currentSubscription.planName}
                    </h3>
                    <p className="text-green-600">
                      {currentSubscription.sessionsUsed}/{currentSubscription.sessionsLimit} sessions used this month
                    </p>
                    <p className="text-sm text-green-600">
                      Next billing: {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Cancel Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans */}
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            {/* Essential Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-green-200">
              <div className="bg-green-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🟢</span>
                  <h2 className="text-2xl font-bold">ESSENTIAL CARE</h2>
                </div>
                <p className="text-green-100">Basic Healthcare</p>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900">₹999</span>
                    <span className="text-gray-600">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₹9,999</span>
                    <span className="text-gray-600">/ year</span>
                  </div>
                </div>

                {/* Best For */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">👤 Best for</h4>
                  <p className="text-gray-600">Individuals seeking basic healthcare consultations</p>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      1 Pharmacist consultation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      1 Doctor consultation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      1 Dietitian consultation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Prescription explanation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Medicine guidance
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      WhatsApp support
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Verified content
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'essential' ? (
                    <>
                      <button
                        onClick={() => handleSubscribe('essential', 'monthly')}
                        disabled={subscribing}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : 'Start Monthly Plan'}
                      </button>
                      <button
                        onClick={() => handleSubscribe('essential', 'yearly')}
                        disabled={subscribing}
                        className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : 'Start Yearly Plan'}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-3 bg-green-100 rounded-lg">
                      <span className="text-green-800 font-semibold">Current Plan</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chronic Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-blue-500 relative transform scale-105">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold z-10">
                ⭐ MOST POPULAR
              </div>
              
              <div className="bg-blue-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🔵</span>
                  <h2 className="text-2xl font-bold">CHRONIC CARE</h2>
                </div>
                <p className="text-blue-100">Diabetes, PCOS & BP Care</p>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900">₹1,799</span>
                    <span className="text-gray-600">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₹16,999</span>
                    <span className="text-gray-600">/ year</span>
                  </div>
                </div>

                {/* Covers */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">👨‍👩‍👧 Covers</h4>
                  <p className="text-gray-600">Up to 4 family members</p>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      3 Pharmacist consultations
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      2 Doctor consultations
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      2 Dietitian consultations with diet chart
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Diabetes, PCOS & BP care
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Lab report explanation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Medication reminders
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Priority booking
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'chronic' ? (
                    <>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('chronic', 'monthly') : handleSubscribe('chronic', 'monthly')}
                        disabled={subscribing}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Monthly' : 'Start Monthly Plan'}
                      </button>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('chronic', 'yearly') : handleSubscribe('chronic', 'yearly')}
                        disabled={subscribing}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Yearly' : 'Start Yearly Plan'}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-3 bg-blue-100 rounded-lg">
                      <span className="text-blue-800 font-semibold">Current Plan</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fat to Fit Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-200">
              <div className="bg-purple-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🟣</span>
                  <h2 className="text-2xl font-bold">FAT TO FIT</h2>
                </div>
                <p className="text-purple-100">Weight Management</p>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900">₹1,299</span>
                    <span className="text-gray-600">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₹12,999</span>
                    <span className="text-gray-600">/ year</span>
                  </div>
                </div>

                {/* Best For */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">🎯 Best for</h4>
                  <p className="text-gray-600">Weight management and fitness goals</p>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      1 Doctor consultation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      2 Dietitian consultations
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      Personalized diet plan
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      Weight management guidance
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      WhatsApp support
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-purple-500 mr-2">✔</span>
                      Priority booking
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'fatToFit' ? (
                    <>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('fatToFit', 'monthly') : handleSubscribe('fatToFit', 'monthly')}
                        disabled={subscribing}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Monthly' : 'Start Monthly Plan'}
                      </button>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('fatToFit', 'yearly') : handleSubscribe('fatToFit', 'yearly')}
                        disabled={subscribing}
                        className="w-full bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Yearly' : 'Start Yearly Plan'}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-3 bg-purple-100 rounded-lg">
                      <span className="text-purple-800 font-semibold">Current Plan</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
                <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold mb-2">What happens if I exceed my session limit?</h3>
                <p className="text-gray-600">You'll need to wait for the next month or upgrade to a higher plan to get more sessions.</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-gray-600">We offer a 7-day free trial for new users to experience our services before committing to a plan.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Disclaimer Modal */}
        {showPaymentDisclaimer && pendingSubscription && (
          <PaymentDisclaimer
            onAccept={pendingSubscription.isUpgrade ? proceedWithUpgrade : proceedWithSubscription}
            onCancel={() => {
              setShowPaymentDisclaimer(false);
              setPendingSubscription(null);
              setSubscribing(false);
            }}
            amount={plans[pendingSubscription.planType][pendingSubscription.billingCycle].price}
            serviceName={`${plans[pendingSubscription.planType].name} - ${pendingSubscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`}
          />
        )}
      </div>
    </Layout>
  );
}
