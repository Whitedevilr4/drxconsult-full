import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

const BILLING_LABELS = {
  threeMonths: '3-Month Plan',
  sixMonths: '6-Month Plan',
  twelveMonths: '12-Month Plan',
  monthly: 'Monthly Plan',
  yearly: 'Yearly Plan',
};

const PLAN_COLORS = {
  womensCare: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-800', text: 'text-pink-700', btn: 'bg-pink-600 hover:bg-pink-700', icon: '🌸' },
  chronic:    { bg: 'bg-blue-50',  border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-800',  text: 'text-blue-700',  btn: 'bg-blue-600 hover:bg-blue-700',  icon: '🔵' },
  fatToFit:   { bg: 'bg-purple-50',border: 'border-purple-200',badge: 'bg-purple-100 text-purple-800',text: 'text-purple-700',btn: 'bg-purple-600 hover:bg-purple-700',icon: '🟣' },
  essential:  { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700',  icon: '🟢' },
};

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(res.data.subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-indigo-800 font-semibold text-base">No Active Subscription</h3>
            <p className="text-indigo-600 text-sm mt-1">Unlock personalised healthcare plans</p>
          </div>
          <Link href="/subscription-plans" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  const colors = PLAN_COLORS[subscription.planType] || PLAN_COLORS.essential;
  const billingLabel = BILLING_LABELS[subscription.billingCycle] || subscription.billingCycle;
  const endDate = new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const daysLeft = Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{colors.icon}</span>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{subscription.planName}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>{billingLabel}</span>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {subscription.status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm mt-3">
        <div className={colors.text}>
          <span className="font-medium">Expires:</span> {endDate}
          {daysLeft <= 30 && (
            <span className="ml-2 text-orange-600 font-medium">({daysLeft}d left)</span>
          )}
        </div>
        <Link href="/subscription-plans" className={`${colors.btn} text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors`}>
          Manage Plan
        </Link>
      </div>
    </div>
  );
}
