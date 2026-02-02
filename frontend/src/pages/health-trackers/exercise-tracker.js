import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ExerciseTracker from '@/components/ExerciseTracker';
import SEO from '@/components/SEO';

export default function ExerciseTrackerPage() {
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
        title="Exercise Tracker - Daily Fitness & Calorie Burn Tracking"
        description="Track your daily exercises, steps, and calorie burn. Get personalized insights on your fitness activities and health benefits."
        keywords="exercise tracker, fitness tracker, calorie burn, step counter, workout tracker, daily exercise, fitness goals"
      />
      <Layout>
        <ExerciseTracker />
      </Layout>
    </>
  );
}