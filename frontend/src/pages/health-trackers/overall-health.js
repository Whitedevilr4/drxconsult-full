import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import OverallHealthTracker from '@/components/OverallHealthTracker';
import SEO from '@/components/SEO';

export default function OverallHealthPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }
    
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <SEO 
        title="Overall Health Tracker - Symptom Tracking & AI Remedies"
        description="Track common symptoms like headaches, fever, cough, runny nose, and pain. Get AI-powered remedy recommendations and health insights."
        keywords="symptom tracker, health tracker, fever tracker, headache relief, cough remedies, cold symptoms, AI health recommendations"
      />
      <OverallHealthTracker />
    </Layout>
  );
}