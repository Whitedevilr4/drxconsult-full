import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import CognitiveAssessment from '@/components/CognitiveAssessment';
import SEO from '@/components/SEO';

export default function CognitiveAssessmentPage() {
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
        title="Cognitive Assessment - Eye & Brain Function Test"
        description="Test your visual perception and memory function with our comprehensive cognitive assessment. Get insights on eye health and brain performance."
        keywords="cognitive assessment, eye test, brain test, memory test, visual perception, cognitive health, mental fitness"
      />
      <Layout>
        <CognitiveAssessment />
      </Layout>
    </>
  );
}