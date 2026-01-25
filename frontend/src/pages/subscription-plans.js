import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function SubscriptionPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

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
          } catch (subscriptionErr) {
            console.error('Subscription creation error:', subscriptionErr);
            toast.error('Payment successful but subscription creation failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setSubscribing(false);
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
    }
  };

  const handleUpgrade = async (planType, billingCycle) => {
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
          } catch (subscriptionErr) {
            console.error('Subscription update error:', subscriptionErr);
            toast.error('Payment successful but subscription update failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setSubscribing(false);
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
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Essential Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-green-200">
              <div className="bg-green-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🟢</span>
                  <h2 className="text-2xl font-bold">PLAN 1: ESSENTIAL CARE</h2>
                </div>
                <p className="text-green-100">Mass Market</p>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900">₹299</span>
                    <span className="text-gray-600">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₹2,999</span>
                    <span className="text-gray-600">/ year</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">Save ₹589 with yearly plan!</p>
                </div>

                {/* Best For */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">👤 Best for</h4>
                  <p className="text-gray-600">Individuals, students, working adults, medicine doubts</p>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      2 Pharmacist counselling sessions / month
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Prescription explanation
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Medicine timing & side-effect guidance
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      WhatsApp chat support (limited, non-emergency)
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-2">✔</span>
                      Access to verified health content
                    </li>
                  </ul>
                </div>

                {/* Not Included */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">❌ Not included</h4>
                  <ul className="space-y-1">
                    <li className="text-gray-500">Diagnosis</li>
                    <li className="text-gray-500">Emergency care</li>
                    <li className="text-gray-500">Unlimited usage</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  🧠 Perfect entry plan. Low price, high volume.
                </p>

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
                        {subscribing ? 'Processing...' : 'Start Yearly Plan (Save 17%)'}
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

            {/* Family & Chronic Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-200 relative">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                HERO PLAN
              </div>
              
              <div className="bg-blue-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🔵</span>
                  <h2 className="text-2xl font-bold">PLAN 2: FAMILY & CHRONIC CARE</h2>
                </div>
                <p className="text-blue-100">Hero Plan</p>
              </div>

              <div className="p-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900">₹799</span>
                    <span className="text-gray-600">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₹7,999</span>
                    <span className="text-gray-600">/ year</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-2">Save ₹1,589 with yearly plan!</p>
                </div>

                {/* Covers */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">👨‍👩‍👧 Covers</h4>
                  <p className="text-gray-600">Up to 4 members</p>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      5 Pharmacist counselling sessions / month
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      1 Doctor follow-up consultation / month
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Chronic medicine guidance (BP, diabetes, thyroid, asthma)
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="text-blue-500 mr-2">✔</span>
                      Lab report & prescription explanation
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
                  {!currentSubscription || currentSubscription.planType !== 'family' ? (
                    <>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('family', 'monthly') : handleSubscribe('family', 'monthly')}
                        disabled={subscribing}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Monthly' : 'Start Monthly Plan'}
                      </button>
                      <button
                        onClick={() => currentSubscription ? handleUpgrade('family', 'yearly') : handleSubscribe('family', 'yearly')}
                        disabled={subscribing}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
                      >
                        {subscribing ? 'Processing...' : currentSubscription ? 'Upgrade to Yearly (Save 17%)' : 'Start Yearly Plan (Save 17%)'}
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
      </div>
    </Layout>
  );
}