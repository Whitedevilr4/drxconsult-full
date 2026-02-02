import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import FoodAnalyzer from '@/components/FoodAnalyzer';
import SEO from '@/components/SEO';

export default function FoodAnalyzerPage() {
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
        title="Indian Food Analyzer - Nutrition Tracking & Analysis"
        description="Track your daily Indian diet nutrition intake with our comprehensive food analyzer. Get personalized insights on calories, carbs, protein, and more for Indian foods."
        keywords="indian food analyzer, nutrition tracker, calorie counter, indian diet tracking, meal planning, desi food nutrition, indian cuisine health"
      />
      <Layout>
        <FoodAnalyzer />
      </Layout>
    </>
  );
}