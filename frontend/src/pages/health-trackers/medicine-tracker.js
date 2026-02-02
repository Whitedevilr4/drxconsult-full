import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import MedicineTracker from '@/components/MedicineTracker';
import SEO from '@/components/SEO';

export default function MedicineTrackerPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <>
      <SEO 
        title="Medicine Tracker - Track Medications & Adherence"
        description="Track your medications, set reminders, and monitor adherence with AI-powered insights. Never miss a dose again."
        keywords="medicine tracker, medication adherence, pill reminder, drug schedule, health tracking"
      />
      <Layout>
        <MedicineTracker />
      </Layout>
    </>
  );
}