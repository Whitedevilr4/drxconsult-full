import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SubstanceUseTracker from '@/components/SubstanceUseTracker';
import SEO from '@/components/SEO';

export default function SubstanceTrackerPage() {
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
        title="Substance Use Tracker - Monitor Smoking & Alcohol"
        description="Track smoking and alcohol consumption patterns, identify triggers, and get support for healthier habits with AI-powered insights."
        keywords="substance use tracker, smoking tracker, alcohol tracker, quit smoking, addiction support, health monitoring"
      />
      <Layout>
        <SubstanceUseTracker />
      </Layout>
    </>
  );
}