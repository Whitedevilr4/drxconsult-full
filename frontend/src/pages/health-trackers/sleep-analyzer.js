import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SleepAnalyzer from '@/components/SleepAnalyzer';
import SEO from '@/components/SEO';

export default function SleepAnalyzerPage() {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
        title="Sleep Analyzer - Track Your Sleep Patterns"
        description="Monitor your sleep quality, duration, and patterns with our AI-powered sleep analyzer. Get personalized insights and recommendations for better sleep."
        keywords="sleep tracker, sleep analyzer, sleep quality, insomnia, sleep patterns, health tracking"
      />
      <SleepAnalyzer />
    </Layout>
  );
}