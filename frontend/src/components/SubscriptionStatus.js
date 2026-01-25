import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-yellow-800 font-semibold">No Active Subscription</h3>
            <p className="text-yellow-700 text-sm">You can still book sessions at normal price</p>
          </div>
          <Link href="/subscription-plans" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'cancelled': return 'red';
      case 'expired': return 'gray';
      default: return 'gray';
    }
  };

  const statusColor = getStatusColor(subscription.status);

  return (
    <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`text-${statusColor}-800 font-semibold`}>
            {subscription.planName}
          </h3>
          <p className={`text-${statusColor}-700 text-sm`}>
            {subscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Plan
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
          {subscription.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-600">Sessions Used</p>
          <p className={`font-semibold text-${statusColor}-800`}>
            {subscription.sessionsUsed} / {subscription.sessionsLimit}
          </p>
        </div>
        {subscription.doctorConsultationsLimit > 0 && (
          <div>
            <p className="text-sm text-gray-600">Doctor Consultations</p>
            <p className={`font-semibold text-${statusColor}-800`}>
              {subscription.doctorConsultationsUsed} / {subscription.doctorConsultationsLimit}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
          </p>
          {subscription.sessionsUsed >= subscription.sessionsLimit && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Limit reached - future bookings at normal price
            </p>
          )}
        </div>
        <Link href="/subscription-plans" className={`text-${statusColor}-600 hover:text-${statusColor}-700 text-sm font-medium`}>
          Manage Plan
        </Link>
      </div>

      {/* Usage Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Session Usage</span>
          <span>{Math.round((subscription.sessionsUsed / subscription.sessionsLimit) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`bg-${statusColor}-500 h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min((subscription.sessionsUsed / subscription.sessionsLimit) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}