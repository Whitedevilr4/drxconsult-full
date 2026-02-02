import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import MoodAnalyzer from '@/components/MoodAnalyzer';
import SEO from '@/components/SEO';

export default function MoodAnalyzerPage() {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
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
        title="Mood Analyzer - Track Your Mental Health"
        description="Monitor your mood, stress, anxiety, and emotional wellbeing with our AI-powered mood analyzer. Get personalized mental health insights and recommendations."
        keywords="mood tracker, mental health, anxiety tracker, stress management, emotional wellbeing, depression screening"
      />
      <MoodAnalyzer />
    </Layout>
  );
}