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
        description: `${planInfo.name} - ${billingCycle === 'monthly' ? 'Monthly' : billingCycle === 'yearly' ? 'Yearly' : billingCycle === 'threeMonths' ? '3 Months' : billingCycle === 'sixMonths' ? '6 Months' : '12 Months'} Plan`,
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
        description: `Upgrade to ${planInfo.name} - ${billingCycle === 'monthly' ? 'Monthly' : billingCycle === 'yearly' ? 'Yearly' : billingCycle === 'threeMonths' ? '3 Months' : billingCycle === 'sixMonths' ? '6 Months' : '12 Months'} Plan`,
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

  // Billing cycle upgrade order
  const cycleOrder = { threeMonths: 1, sixMonths: 2, twelveMonths: 3, monthly: 1, yearly: 3 };
  const canUpgradeTo = (targetCycle) => {
    if (!currentSubscription) return false;
    return (cycleOrder[targetCycle] || 0) > (cycleOrder[currentSubscription.billingCycle] || 0);
  };
  const isCurrentTier = (planType, cycle) =>
    currentSubscription?.planType === planType && currentSubscription?.billingCycle === cycle;

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
            {/* Women's Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-pink-500 relative transform scale-105">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold z-10">
                ⭐ FEATURED
              </div>

              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🌸</span>
                  <h2 className="text-2xl font-bold">WOMEN'S CARE</h2>
                </div>
                <p className="text-pink-100">Complete Women's Health Plan</p>
              </div>

              <div className="p-6">
                {/* Pricing Tiers */}
                <div className="mb-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">💰 Choose Your Plan</h4>
                  <div className="bg-pink-100 rounded-lg p-3 flex justify-between items-center border-2 border-pink-300">
                    <div>
                      <span className="text-gray-700 font-medium">3 Months</span>
                      <span className="ml-2 text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">Best Value</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹17,499</span>
                      <span className="text-2xl font-bold text-pink-600">₹13,999</span>
                    </div>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">6 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹34,999</span>
                      <span className="text-2xl font-bold text-pink-600">₹27,499</span>
                    </div>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">12 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹69,999</span>
                      <span className="text-2xl font-bold text-pink-600">₹54,999</span>
                    </div>
                  </div>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    {[
                      '1-to-1 Gynaecologist consultation',
                      'Personalised diet chart',
                      '1-to-1 Dietician consultation',
                      '1 Comprehensive medical history',
                      'Hair & skin care',
                      'Live yoga sessions',
                      'Period & PCOS care',
                      'Weight management',
                      '1-to-1 WhatsApp support',
                      'Priority care'
                    ].map((item) => (
                      <li key={item} className="flex items-center text-gray-700">
                        <span className="text-pink-500 mr-2">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'womensCare' ? (
                    <>
                      <button onClick={() => currentSubscription ? handleUpgrade('womensCare', 'threeMonths') : handleSubscribe('womensCare', 'threeMonths')} disabled={subscribing} className="w-full bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 3-Month Plan — ₹13,999'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('womensCare', 'sixMonths') : handleSubscribe('womensCare', 'sixMonths')} disabled={subscribing} className="w-full bg-pink-500 text-white py-2 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 6-Month Plan — ₹27,499'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('womensCare', 'twelveMonths') : handleSubscribe('womensCare', 'twelveMonths')} disabled={subscribing} className="w-full bg-rose-600 text-white py-2 rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 12-Month Plan — ₹54,999'}
                      </button>
                    </>
                  ) : (
                    <>
                      {isCurrentTier('womensCare', 'threeMonths') && <div className="text-center py-2 bg-pink-100 rounded-lg text-pink-800 text-sm font-semibold">✅ Current Plan — 3 Months</div>}
                      {!isCurrentTier('womensCare', 'sixMonths') && !isCurrentTier('womensCare', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('womensCare', 'sixMonths')} disabled={subscribing} className="w-full bg-pink-500 text-white py-2 rounded-lg font-semibold hover:bg-pink-600 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 6-Month — ₹27,499'}
                        </button>
                      )}
                      {isCurrentTier('womensCare', 'sixMonths') && <div className="text-center py-2 bg-pink-100 rounded-lg text-pink-800 text-sm font-semibold">✅ Current Plan — 6 Months</div>}
                      {!isCurrentTier('womensCare', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('womensCare', 'twelveMonths')} disabled={subscribing} className="w-full bg-rose-600 text-white py-2 rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 12-Month — ₹54,999'}
                        </button>
                      )}
                      {isCurrentTier('womensCare', 'twelveMonths') && <div className="text-center py-2 bg-pink-100 rounded-lg text-pink-800 text-sm font-semibold">✅ Current Plan — 12 Months</div>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Chronic Care Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-200">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🔵</span>
                  <h2 className="text-2xl font-bold">CHRONIC CARE</h2>
                </div>
                <p className="text-blue-100">Complete Chronic Disease Management</p>
              </div>

              <div className="p-6">
                {/* Pricing Tiers */}
                <div className="mb-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">💰 Choose Your Plan</h4>
                  <div className="bg-blue-100 rounded-lg p-3 flex justify-between items-center border-2 border-blue-300">
                    <div>
                      <span className="text-gray-700 font-medium">3 Months</span>
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Best Value</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹23,999</span>
                      <span className="text-2xl font-bold text-blue-600">₹18,999</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">6 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹46,999</span>
                      <span className="text-2xl font-bold text-blue-600">₹37,499</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">12 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹94,999</span>
                      <span className="text-2xl font-bold text-blue-600">₹73,999</span>
                    </div>
                  </div>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    {[
                      '1-to-1 Doctor consultation monthly',
                      'Dedicated diet coach',
                      'Personalised diet chart',
                      'Comprehensive medical history',
                      'BP management',
                      'Diabetes management',
                      'Thyroid care',
                      'Live yoga sessions',
                      'Weight sessions',
                      '1-to-1 WhatsApp support',
                      'Priority care'
                    ].map((item) => (
                      <li key={item} className="flex items-center text-gray-700">
                        <span className="text-blue-500 mr-2">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'chronic' ? (
                    <>
                      <button onClick={() => currentSubscription ? handleUpgrade('chronic', 'threeMonths') : handleSubscribe('chronic', 'threeMonths')} disabled={subscribing} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 3-Month Plan — ₹18,999'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('chronic', 'sixMonths') : handleSubscribe('chronic', 'sixMonths')} disabled={subscribing} className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 6-Month Plan — ₹37,499'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('chronic', 'twelveMonths') : handleSubscribe('chronic', 'twelveMonths')} disabled={subscribing} className="w-full bg-cyan-600 text-white py-2 rounded-lg font-semibold hover:bg-cyan-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 12-Month Plan — ₹73,999'}
                      </button>
                    </>
                  ) : (
                    <>
                      {isCurrentTier('chronic', 'threeMonths') && <div className="text-center py-2 bg-blue-100 rounded-lg text-blue-800 text-sm font-semibold">✅ Current Plan — 3 Months</div>}
                      {!isCurrentTier('chronic', 'sixMonths') && !isCurrentTier('chronic', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('chronic', 'sixMonths')} disabled={subscribing} className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 6-Month — ₹37,499'}
                        </button>
                      )}
                      {isCurrentTier('chronic', 'sixMonths') && <div className="text-center py-2 bg-blue-100 rounded-lg text-blue-800 text-sm font-semibold">✅ Current Plan — 6 Months</div>}
                      {!isCurrentTier('chronic', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('chronic', 'twelveMonths')} disabled={subscribing} className="w-full bg-cyan-600 text-white py-2 rounded-lg font-semibold hover:bg-cyan-700 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 12-Month — ₹73,999'}
                        </button>
                      )}
                      {isCurrentTier('chronic', 'twelveMonths') && <div className="text-center py-2 bg-blue-100 rounded-lg text-blue-800 text-sm font-semibold">✅ Current Plan — 12 Months</div>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Fat to Fit Plan */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-200">
              <div className="bg-gradient-to-r from-purple-600 to-violet-500 text-white p-6">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🟣</span>
                  <h2 className="text-2xl font-bold">FAT TO FIT</h2>
                </div>
                <p className="text-purple-100">Dedicated Weight Management Plan</p>
              </div>

              <div className="p-6">
                {/* Pricing Tiers */}
                <div className="mb-6 space-y-3">
                  <h4 className="font-semibold text-gray-900">💰 Choose Your Plan</h4>
                  <div className="bg-purple-100 rounded-lg p-3 flex justify-between items-center border-2 border-purple-300">
                    <div>
                      <span className="text-gray-700 font-medium">3 Months</span>
                      <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Best Value</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹15,999</span>
                      <span className="text-2xl font-bold text-purple-600">₹12,999</span>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">6 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹29,999</span>
                      <span className="text-2xl font-bold text-purple-600">₹23,999</span>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-gray-700 font-medium">12 Months</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-400 line-through block">₹44,999</span>
                      <span className="text-2xl font-bold text-purple-600">₹35,999</span>
                    </div>
                  </div>
                </div>

                {/* Includes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">✅ Includes</h4>
                  <ul className="space-y-2">
                    {[
                      '1-to-1 diet coach',
                      'Coach follow-up weekly',
                      'Live yoga sessions',
                      '1 Comprehensive medical history',
                      'Personalised diet chart',
                      'Weight management',
                      '1-to-1 WhatsApp support',
                      'Craving care',
                      'Motivated week planning',
                      'Cheat meal guidance'
                    ].map((item) => (
                      <li key={item} className="flex items-center text-gray-700">
                        <span className="text-purple-500 mr-2">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!currentSubscription || currentSubscription.planType !== 'fatToFit' ? (
                    <>
                      <button onClick={() => currentSubscription ? handleUpgrade('fatToFit', 'threeMonths') : handleSubscribe('fatToFit', 'threeMonths')} disabled={subscribing} className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 3-Month Plan — ₹12,999'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('fatToFit', 'sixMonths') : handleSubscribe('fatToFit', 'sixMonths')} disabled={subscribing} className="w-full bg-purple-500 text-white py-2 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 6-Month Plan — ₹23,999'}
                      </button>
                      <button onClick={() => currentSubscription ? handleUpgrade('fatToFit', 'twelveMonths') : handleSubscribe('fatToFit', 'twelveMonths')} disabled={subscribing} className="w-full bg-violet-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 text-sm">
                        {subscribing ? 'Processing...' : 'Start 12-Month Plan — ₹35,999'}
                      </button>
                    </>
                  ) : (
                    <>
                      {isCurrentTier('fatToFit', 'threeMonths') && <div className="text-center py-2 bg-purple-100 rounded-lg text-purple-800 text-sm font-semibold">✅ Current Plan — 3 Months</div>}
                      {!isCurrentTier('fatToFit', 'sixMonths') && !isCurrentTier('fatToFit', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('fatToFit', 'sixMonths')} disabled={subscribing} className="w-full bg-purple-500 text-white py-2 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 6-Month — ₹23,999'}
                        </button>
                      )}
                      {isCurrentTier('fatToFit', 'sixMonths') && <div className="text-center py-2 bg-purple-100 rounded-lg text-purple-800 text-sm font-semibold">✅ Current Plan — 6 Months</div>}
                      {!isCurrentTier('fatToFit', 'twelveMonths') && (
                        <button onClick={() => handleUpgrade('fatToFit', 'twelveMonths')} disabled={subscribing} className="w-full bg-violet-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 text-sm">
                          {subscribing ? 'Processing...' : '⬆ Upgrade to 12-Month — ₹35,999'}
                        </button>
                      )}
                      {isCurrentTier('fatToFit', 'twelveMonths') && <div className="text-center py-2 bg-purple-100 rounded-lg text-purple-800 text-sm font-semibold">✅ Current Plan — 12 Months</div>}
                    </>
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
            amount={plans[pendingSubscription.planType]?.[pendingSubscription.billingCycle]?.price}
            serviceName={`${plans[pendingSubscription.planType].name} - ${pendingSubscription.billingCycle === 'monthly' ? 'Monthly' : pendingSubscription.billingCycle === 'yearly' ? 'Yearly' : pendingSubscription.billingCycle === 'threeMonths' ? '3 Months' : pendingSubscription.billingCycle === 'sixMonths' ? '6 Months' : '12 Months'} Subscription`}
          />
        )}
      </div>
    </Layout>
  );
}
