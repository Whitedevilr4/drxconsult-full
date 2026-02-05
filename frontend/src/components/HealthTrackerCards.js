import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from '@/lib/axios';
import HealthReportDownload from './HealthReportDownload';

const HealthTrackerCards = () => {
  const router = useRouter();
  const [healthOverview, setHealthOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    fetchHealthOverview();
  }, []);

  const fetchHealthOverview = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch data from all trackers
      const [
        vaccineResponse,
        periodResponse,
        bpResponse,
        diabetesResponse,
        sleepResponse,
        moodResponse,
        overallResponse,
        medicineResponse,
        medicineTodayResponse,
        substanceResponse,
        foodResponse
      ] = await Promise.allSettled([
        axios.get('/health-trackers/vaccine-tracker'),
        axios.get('/health-trackers/period-tracker'),
        axios.get('/health-trackers/bp-tracker'),
        axios.get('/health-trackers/diabetes-tracker'),
        axios.get('/health-trackers/sleep-tracker'),
        axios.get('/health-trackers/mood-tracker'),
        axios.get('/health-trackers/overall-health-tracker'),
        axios.get('/health-trackers/medicine-tracker'),
        axios.get('/health-trackers/medicine-tracker/today'),
        axios.get('/health-trackers/substance-tracker'),
        axios.get('/health-trackers/food-tracker')
      ]);

      const overview = generateHealthOverview({
        vaccines: vaccineResponse.status === 'fulfilled' ? vaccineResponse.value.data : [],
        period: periodResponse.status === 'fulfilled' ? periodResponse.value.data : null,
        bp: bpResponse.status === 'fulfilled' ? bpResponse.value.data : [],
        diabetes: diabetesResponse.status === 'fulfilled' ? diabetesResponse.value.data : [],
        sleep: sleepResponse.status === 'fulfilled' ? sleepResponse.value.data : { entries: [] },
        mood: moodResponse.status === 'fulfilled' ? moodResponse.value.data : { entries: [] },
        overall: overallResponse.status === 'fulfilled' ? overallResponse.value.data : { entries: [] },
        medicine: medicineResponse.status === 'fulfilled' ? medicineResponse.value.data : { medicines: [], medicineLog: [] },
        medicineToday: medicineTodayResponse.status === 'fulfilled' ? medicineTodayResponse.value.data : { todaySchedule: [], upcomingSchedule: [] },
        substance: substanceResponse.status === 'fulfilled' ? substanceResponse.value.data : { entries: [] },
        food: foodResponse.status === 'fulfilled' ? foodResponse.value.data : { meals: [] }
      });

      setHealthOverview(overview);
    } catch (error) {
      console.error('Error fetching health overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHealthOverview = (data) => {
    const overview = {
      totalTrackers: 0,
      activeTrackers: 0,
      recentEntries: 0,
      healthScore: 0,
      alerts: [],
      insights: [],
      recommendations: [],
      medicineStatus: {
        todayTaken: 0,
        todayPending: 0,
        todayMissed: 0,
        adherenceRate: 0,
        totalDoses: 0,
        autoMissed: 0
      }
    };

    // Child Vaccine Tracker Analysis
    if (data.vaccines && data.vaccines.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      
      const child = data.vaccines[0];
      const overdueVaccines = child.vaccines?.filter(v => {
        if (v.isCompleted) return false;
        const dueDate = new Date(v.dueDate);
        return dueDate < new Date();
      }) || [];

      if (overdueVaccines.length > 0) {
        overview.alerts.push({
          type: 'warning',
          title: 'Overdue Vaccines',
          message: `${overdueVaccines.length} vaccine(s) are overdue for ${child.babyName}`,
          tracker: 'Child Vaccine'
        });
      } else {
        overview.insights.push({
          type: 'success',
          title: 'Vaccination On Track',
          message: `${child.babyName} is up to date with vaccinations`,
          tracker: 'Child Vaccine'
        });
      }
    }

    // Blood Pressure Analysis
    if (data.bp && data.bp.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.bp.length, 7);

      const recentBP = data.bp.slice(0, 5);
      const highBPReadings = recentBP.filter(reading => 
        reading.systolic > 140 || reading.diastolic > 90
      );

      if (highBPReadings.length > 2) {
        overview.alerts.push({
          type: 'danger',
          title: 'High Blood Pressure',
          message: `${highBPReadings.length} high BP readings in recent entries`,
          tracker: 'Blood Pressure'
        });
      }
    }

    // Diabetes Analysis
    if (data.diabetes && data.diabetes.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.diabetes.length, 7);

      const recentGlucose = data.diabetes.slice(0, 5);
      const highGlucose = recentGlucose.filter(reading => reading.glucoseLevel > 180);
      const lowGlucose = recentGlucose.filter(reading => reading.glucoseLevel < 70);

      if (highGlucose.length > 0 || lowGlucose.length > 0) {
        overview.alerts.push({
          type: 'warning',
          title: 'Glucose Levels Need Attention',
          message: `${highGlucose.length} high and ${lowGlucose.length} low glucose readings`,
          tracker: 'Diabetes'
        });
      }
    }

    // Sleep Analysis
    if (data.sleep && data.sleep.entries && data.sleep.entries.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.sleep.entries.length, 7);

      const recentSleep = data.sleep.entries.slice(0, 7);
      const avgSleepDuration = recentSleep.reduce((sum, entry) => sum + entry.sleepDuration, 0) / recentSleep.length;
      const poorSleepDays = recentSleep.filter(entry => entry.sleepQuality === 'poor' || entry.sleepQuality === 'fair').length;

      if (avgSleepDuration < 6) {
        overview.alerts.push({
          type: 'warning',
          title: 'Insufficient Sleep',
          message: `Average sleep duration: ${avgSleepDuration.toFixed(1)} hours`,
          tracker: 'Sleep'
        });
      } else if (avgSleepDuration >= 7 && avgSleepDuration <= 9) {
        overview.insights.push({
          type: 'success',
          title: 'Good Sleep Duration',
          message: `Maintaining healthy sleep duration: ${avgSleepDuration.toFixed(1)} hours`,
          tracker: 'Sleep'
        });
      }

      if (poorSleepDays > 3) {
        overview.recommendations.push({
          title: 'Improve Sleep Quality',
          message: 'Consider sleep hygiene practices and relaxation techniques',
          tracker: 'Sleep'
        });
      }
    }

    // Mood Analysis
    if (data.mood && data.mood.entries && data.mood.entries.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.mood.entries.length, 7);

      const recentMood = data.mood.entries.slice(0, 7);
      const lowMoodDays = recentMood.filter(entry => 
        entry.overallMood === 'sad' || entry.overallMood === 'very_sad'
      ).length;
      const highStressDays = recentMood.filter(entry => 
        entry.stressLevel === 'high' || entry.stressLevel === 'very_high'
      ).length;

      if (lowMoodDays > 3) {
        overview.alerts.push({
          type: 'warning',
          title: 'Mood Concerns',
          message: `${lowMoodDays} days of low mood in the past week`,
          tracker: 'Mood'
        });
      }

      if (highStressDays > 4) {
        overview.recommendations.push({
          title: 'Stress Management',
          message: 'Consider stress reduction techniques and relaxation practices',
          tracker: 'Mood'
        });
      }
    }

    // Overall Health Analysis
    if (data.overall && data.overall.entries && data.overall.entries.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.overall.entries.length, 7);

      const recentHealth = data.overall.entries.slice(0, 7);
      const symptomsPresent = recentHealth.some(entry => 
        Object.values(entry.symptoms || {}).some(symptom => 
          (symptom.severity && symptom.severity !== 'none') || 
          (symptom.temperature && symptom.temperature > 99)
        )
      );

      if (symptomsPresent) {
        overview.alerts.push({
          type: 'info',
          title: 'Recent Symptoms',
          message: 'Symptoms tracked in recent entries - check recommendations',
          tracker: 'Overall Health'
        });
      }

      const lowWellbeingDays = recentHealth.filter(entry => 
        entry.overallWellbeing === 'poor' || entry.overallWellbeing === 'very_poor'
      ).length;

      if (lowWellbeingDays > 2) {
        overview.recommendations.push({
          title: 'Focus on Wellness',
          message: 'Consider lifestyle improvements and consult healthcare provider',
          tracker: 'Overall Health'
        });
      }
    }

    // Period Tracker Analysis
    if (data.period) {
      overview.totalTrackers++;
      overview.activeTrackers++;

      if (data.period.pcosAssessments && data.period.pcosAssessments.length > 0) {
        const latestAssessment = data.period.pcosAssessments[data.period.pcosAssessments.length - 1];
        if (latestAssessment.riskLevel === 'High') {
          overview.alerts.push({
            type: 'warning',
            title: 'PCOS Risk Assessment',
            message: 'High risk detected - consider consulting gynecologist',
            tracker: 'Period & PCOS'
          });
        }
      }
    }

    // Enhanced Medicine Tracker Analysis with Automatic Tracking
    if (data.medicine && (data.medicine.medicines?.length > 0 || data.medicine.medicineLog?.length > 0)) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.medicine.medicineLog?.length || 0, 7);

      const activeMedicines = data.medicine.medicines?.filter(med => med.isActive) || [];
      const recentLog = data.medicine.medicineLog?.slice(0, 14) || []; // Check last 2 weeks
      
      // Use today's schedule data if available
      const todaySchedule = data.medicineToday?.todaySchedule || [];
      
      const missedDoses = recentLog.filter(log => log.status === 'missed').length;
      const takenDoses = recentLog.filter(log => log.status === 'taken').length;
      const autoMissedDoses = recentLog.filter(log => log.status === 'missed' && log.autoMarked).length;
      const totalDoses = recentLog.length;

      // Today's medicine status from today's schedule
      const todayTaken = todaySchedule.filter(log => log.status === 'taken').length;
      const todayMissed = todaySchedule.filter(log => log.status === 'missed').length;
      const todayPending = todaySchedule.filter(log => log.status === 'pending').length;

      // Update medicine status for dashboard
      overview.medicineStatus = {
        todayTaken,
        todayPending,
        todayMissed,
        adherenceRate: totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0,
        totalDoses,
        autoMissed: autoMissedDoses
      };

      if (activeMedicines.length > 0) {
        overview.insights.push({
          type: 'info',
          title: 'Smart Medicine Tracking Active',
          message: `Tracking ${activeMedicines.length} active medication(s) with automatic missed dose detection`,
          tracker: 'Medicine'
        });
      }

      // Today's medicine status alerts
      if (todayPending > 0) {
        const now = new Date();
        const pendingOverdue = todaySchedule.filter(log => {
          if (log.status !== 'pending') return false;
          const scheduleDateTime = new Date(`${log.scheduledDate}T${log.scheduledTime}`);
          const timeDiff = (now - scheduleDateTime) / (1000 * 60); // minutes
          return timeDiff > 120; // 2 hours grace period
        }).length;

        if (pendingOverdue > 0) {
          overview.alerts.push({
            type: 'warning',
            title: 'Overdue Medications Today',
            message: `${pendingOverdue} dose(s) overdue - will be auto-marked as missed soon`,
            tracker: 'Medicine'
          });
        } else if (todayPending > 0) {
          overview.alerts.push({
            type: 'info',
            title: 'Pending Medications Today',
            message: `${todayPending} dose(s) scheduled for today - don't forget!`,
            tracker: 'Medicine'
          });
        }
      }

      if (todayTaken > 0) {
        overview.insights.push({
          type: 'success',
          title: 'Today\'s Progress',
          message: `${todayTaken} dose(s) taken today - great job staying on track!`,
          tracker: 'Medicine'
        });
      }

      if (todayMissed > 0) {
        overview.alerts.push({
          type: 'warning',
          title: 'Missed Doses Today',
          message: `${todayMissed} dose(s) missed today - try to stay consistent`,
          tracker: 'Medicine'
        });
      }

      // Automatic tracking insights
      if (autoMissedDoses > 0) {
        overview.insights.push({
          type: 'info',
          title: 'Automatic Tracking Working',
          message: `${autoMissedDoses} missed doses auto-detected in the last 2 weeks`,
          tracker: 'Medicine'
        });
      }

      // Overall adherence analysis
      if (totalDoses > 0) {
        const adherenceRate = Math.round((takenDoses / totalDoses) * 100);
        if (adherenceRate < 70) {
          overview.alerts.push({
            type: 'danger',
            title: 'Critical Medication Adherence',
            message: `${adherenceRate}% adherence rate - ${missedDoses} missed doses in 2 weeks`,
            tracker: 'Medicine'
          });
        } else if (adherenceRate < 85) {
          overview.alerts.push({
            type: 'warning',
            title: 'Low Medication Adherence',
            message: `${adherenceRate}% adherence rate - ${missedDoses} missed doses recently`,
            tracker: 'Medicine'
          });
        } else if (adherenceRate >= 95) {
          overview.insights.push({
            type: 'success',
            title: 'Excellent Medication Adherence',
            message: `${adherenceRate}% adherence rate - you're doing great!`,
            tracker: 'Medicine'
          });
        } else {
          overview.insights.push({
            type: 'success',
            title: 'Good Medication Adherence',
            message: `${adherenceRate}% adherence rate - keep up the good work!`,
            tracker: 'Medicine'
          });
        }
      }

      // Smart recommendations based on patterns
      if (missedDoses > 5) {
        overview.recommendations.push({
          title: 'Improve Medication Adherence',
          message: 'Consider setting phone alarms, using pill organizers, or asking family for reminders',
          tracker: 'Medicine'
        });
      }

      if (autoMissedDoses > 3) {
        overview.recommendations.push({
          title: 'Reduce Auto-Missed Doses',
          message: 'Set earlier reminders to avoid the 2-hour grace period for automatic missed marking',
          tracker: 'Medicine'
        });
      }

      // Weekly pattern analysis
      const weeklyMissed = recentLog.filter(log => {
        const logDate = new Date(log.scheduledTime);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return log.status === 'missed' && logDate >= weekAgo;
      }).length;

      if (weeklyMissed > 2) {
        overview.recommendations.push({
          title: 'Weekly Medication Review',
          message: `${weeklyMissed} doses missed this week - consider adjusting your routine`,
          tracker: 'Medicine'
        });
      }
    }

    // Substance Use Tracker Analysis
    if (data.substance && data.substance.entries && data.substance.entries.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.substance.entries.length, 7);

      const recentEntries = data.substance.entries.slice(0, 7);
      const smokingDays = recentEntries.filter(entry => 
        entry.smoking.cigarettes > 0 || entry.smoking.cigars > 0 || entry.smoking.vaping.sessions > 0
      ).length;
      const drinkingDays = recentEntries.filter(entry => 
        entry.alcohol.beer > 0 || entry.alcohol.wine > 0 || entry.alcohol.spirits > 0
      ).length;
      
      const totalCigarettes = recentEntries.reduce((sum, entry) => sum + entry.smoking.cigarettes, 0);
      const totalAlcoholUnits = recentEntries.reduce((sum, entry) => 
        sum + entry.alcohol.beer + entry.alcohol.wine + (entry.alcohol.spirits * 1.5), 0
      );

      if (smokingDays > 0) {
        overview.alerts.push({
          type: 'warning',
          title: 'Smoking Activity',
          message: `${smokingDays} smoking days, ${totalCigarettes} cigarettes in past week`,
          tracker: 'Substance Use'
        });
        
        overview.recommendations.push({
          title: 'Smoking Cessation Support',
          message: 'Consider quit strategies and professional support for smoking cessation',
          tracker: 'Substance Use'
        });
      }

      if (totalAlcoholUnits > 14) { // WHO recommended weekly limit
        overview.alerts.push({
          type: 'warning',
          title: 'High Alcohol Consumption',
          message: `${totalAlcoholUnits.toFixed(1)} units consumed - exceeds recommended weekly limit`,
          tracker: 'Substance Use'
        });
      }

      if (drinkingDays > 5) {
        overview.recommendations.push({
          title: 'Alcohol Reduction',
          message: 'Consider alcohol-free days and moderation strategies',
          tracker: 'Substance Use'
        });
      }
    }

    // Food Tracker Analysis
    if (data.food && data.food.meals && data.food.meals.length > 0) {
      overview.totalTrackers++;
      overview.activeTrackers++;
      overview.recentEntries += Math.min(data.food.meals.length, 7);

      const recentMeals = data.food.meals.slice(-7);
      const totalCalories = recentMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
      const avgDailyCalories = Math.round(totalCalories / Math.min(recentMeals.length, 7));

      if (data.food.userProfile) {
        const calorieGoal = data.food.userProfile.dailyCalorieGoal;
        const caloriePercentage = Math.round((avgDailyCalories / calorieGoal) * 100);

        if (caloriePercentage > 120) {
          overview.alerts.push({
            type: 'warning',
            title: 'High Calorie Intake',
            message: `Average daily calories: ${avgDailyCalories} (${caloriePercentage}% of goal)`,
            tracker: 'Food Analyzer'
          });
        } else if (caloriePercentage < 80) {
          overview.alerts.push({
            type: 'warning',
            title: 'Low Calorie Intake',
            message: `Average daily calories: ${avgDailyCalories} (${caloriePercentage}% of goal)`,
            tracker: 'Food Analyzer'
          });
        } else {
          overview.insights.push({
            type: 'success',
            title: 'Good Calorie Balance',
            message: `Maintaining healthy calorie intake: ${avgDailyCalories} calories/day`,
            tracker: 'Food Analyzer'
          });
        }

        // Check for high sugar intake
        const avgSugar = recentMeals.reduce((sum, meal) => sum + meal.totalSugar, 0) / recentMeals.length;
        if (avgSugar > 50) {
          overview.recommendations.push({
            title: 'Reduce Sugar Intake',
            message: `Average sugar: ${Math.round(avgSugar)}g/day (recommended: <50g)`,
            tracker: 'Food Analyzer'
          });
        }

        // Check for high sodium
        const avgSodium = recentMeals.reduce((sum, meal) => sum + meal.totalSodium, 0) / recentMeals.length;
        if (avgSodium > 2300) {
          overview.recommendations.push({
            title: 'Reduce Sodium Intake',
            message: `Average sodium: ${Math.round(avgSodium)}mg/day (recommended: <2300mg)`,
            tracker: 'Food Analyzer'
          });
        }
      }

      overview.insights.push({
        type: 'info',
        title: 'Nutrition Tracking Active',
        message: `${recentMeals.length} meals logged recently`,
        tracker: 'Food Analyzer'
      });
    }

    // Calculate Health Score (0-100)
    let score = 100;
    score -= overview.alerts.filter(a => a.type === 'danger').length * 20;
    score -= overview.alerts.filter(a => a.type === 'warning').length * 10;
    score -= overview.alerts.filter(a => a.type === 'info').length * 5;
    score += overview.insights.length * 5;
    overview.healthScore = Math.max(0, Math.min(100, score));

    // General recommendations
    if (overview.recentEntries < 7) {
      overview.recommendations.push({
        title: 'Increase Tracking Consistency',
        message: 'Regular tracking provides better health insights',
        tracker: 'General'
      });
    }

    return overview;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'danger': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📋';
    }
  };

  const trackers = [
    {
      id: 'child-vaccine',
      title: 'Child Vaccine Tracker',
      description: 'Track your child\'s vaccination schedule and due dates',
      icon: '💉',
      color: 'bg-blue-500',
      route: '/health-trackers/child-vaccine'
    },
    {
      id: 'period-pcos',
      title: 'Period & PCOS Tracker',
      description: 'Monitor menstrual cycles and assess PCOS risk',
      icon: '🌸',
      color: 'bg-pink-500',
      route: '/health-trackers/period-pcos'
    },
    {
      id: 'bp-tracker',
      title: 'Blood Pressure Tracker',
      description: 'Monitor and track your blood pressure readings',
      icon: '❤️',
      color: 'bg-red-500',
      route: '/health-trackers/bp-tracker'
    },
    {
      id: 'diabetes-tracker',
      title: 'Diabetes Tracker',
      description: 'Track glucose levels and manage diabetes',
      icon: '🩺',
      color: 'bg-green-500',
      route: '/health-trackers/diabetes-tracker'
    },
    {
      id: 'sleep-tracker',
      title: 'Sleep Analyzer',
      description: 'Track sleep patterns and improve sleep quality',
      icon: '😴',
      color: 'bg-purple-500',
      route: '/health-trackers/sleep-analyzer'
    },
    {
      id: 'mood-tracker',
      title: 'Mood Analyzer',
      description: 'Monitor mental health and emotional wellbeing',
      icon: '😊',
      color: 'bg-yellow-500',
      route: '/health-trackers/mood-analyzer'
    },
    {
      id: 'overall-health',
      title: 'Overall Health Tracker',
      description: 'Track symptoms and get AI-powered remedy recommendations',
      icon: '🏥',
      color: 'bg-indigo-500',
      route: '/health-trackers/overall-health'
    },
    {
      id: 'medicine-tracker',
      title: 'Smart Medicine Tracker',
      description: 'AI-powered medication tracking with automatic missed dose detection and adherence monitoring',
      icon: '💊',
      color: 'bg-teal-500',
      route: '/health-trackers/medicine-tracker'
    },
    {
      id: 'substance-tracker',
      title: 'Substance Use Tracker',
      description: 'Monitor smoking and alcohol use patterns with quit support',
      icon: '🚭',
      color: 'bg-orange-500',
      route: '/health-trackers/substance-tracker'
    },
    {
      id: 'food-analyzer',
      title: 'Indian Food Analyzer',
      description: 'Track Indian diet nutrition intake and get personalized dietary insights',
      icon: '🍽️',
      color: 'bg-emerald-500',
      route: '/health-trackers/food-analyzer'
    },
    {
      id: 'exercise-tracker',
      title: 'Exercise Tracker',
      description: 'Track daily exercises, steps, and calorie burn with health benefits',
      icon: '🏃‍♂️',
      color: 'bg-blue-500',
      route: '/health-trackers/exercise-tracker'
    },
    {
      id: 'cognitive-assessment',
      title: 'Cognitive Assessment',
      description: 'Test your visual perception and memory function',
      icon: '🧠',
      color: 'bg-purple-500',
      route: '/health-trackers/cognitive-assessment'
    }
  ];

  const handleCardClick = (route) => {
    router.push(route);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Smart Health Check Section</h1>
        <p className="text-gray-600">Monitor and track your health with AI-powered tools and automatic tracking</p>
      </div>

      {/* Health Overview Dashboard */}
      {!loading && healthOverview && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Your Health Overview</h2>
          
          {/* Enhanced Health Score and Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className={`${getScoreBg(healthOverview.healthScore)} border rounded-lg p-4 text-center`}>
              <div className={`text-3xl font-bold ${getScoreColor(healthOverview.healthScore)}`}>
                {healthOverview.healthScore}
              </div>
              <div className="text-sm text-gray-600">Health Score</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{healthOverview.activeTrackers}</div>
              <div className="text-sm text-gray-600">Active Trackers</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{healthOverview.recentEntries}</div>
              <div className="text-sm text-gray-600">Recent Entries</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">{healthOverview.alerts.length}</div>
              <div className="text-sm text-gray-600">Health Alerts</div>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">💊</div>
              <div className="text-xs text-gray-600">Auto Tracking</div>
              <div className="text-xs text-teal-600 font-medium">Active</div>
            </div>
          </div>

          {/* Medicine Tracking Status - Real-time */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-teal-800 flex items-center">
                <span className="mr-2">💊</span>
                Smart Medicine Tracking Status
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchHealthOverview}
                  className="text-sm text-teal-600 hover:text-teal-800 bg-white border border-teal-200 rounded-lg px-3 py-1 hover:bg-teal-50 transition-colors"
                  disabled={loading}
                >
                  {loading ? '⟳' : '🔄'} Refresh
                </button>
                <div className="flex items-center text-sm text-teal-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Auto-tracking Active
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-teal-100">
                <div className="text-sm text-gray-600">Today's Progress</div>
                <div className="text-lg font-bold text-green-600">
                  {healthOverview.medicineStatus?.todayTaken || 0} taken
                </div>
                <div className="text-xs text-gray-500">
                  {healthOverview.medicineStatus?.todayPending || 0} pending
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-teal-100">
                <div className="text-sm text-gray-600">Today's Missed</div>
                <div className="text-lg font-bold text-red-600">
                  {healthOverview.medicineStatus?.todayMissed || 0} missed
                </div>
                <div className="text-xs text-gray-500">
                  Doses not taken
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-teal-100">
                <div className="text-sm text-gray-600">2-Week Adherence</div>
                <div className="text-lg font-bold text-blue-600">
                  {healthOverview.medicineStatus?.adherenceRate || 0}%
                </div>
                <div className="text-xs text-gray-500">
                  {healthOverview.medicineStatus?.totalDoses || 0} total doses
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-teal-100">
                <div className="text-sm text-gray-600">Auto-Detected</div>
                <div className="text-lg font-bold text-orange-600">
                  {healthOverview.medicineStatus?.autoMissed || 0} missed
                </div>
                <div className="text-xs text-gray-500">
                  Automatically marked
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-teal-700 bg-teal-100 rounded-lg p-2">
              <strong>How it works:</strong> Medicines are automatically marked as "missed" if not taken within 2 hours of scheduled time. 
              System checks every 15 minutes to ensure accurate tracking.
            </div>
          </div>

          {/* Alerts and Insights */}
          {(healthOverview.alerts.length > 0 || healthOverview.insights.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Alerts */}
              {healthOverview.alerts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">🚨 Health Alerts</h3>
                  <div className="space-y-3">
                    {healthOverview.alerts.slice(0, 3).map((alert, index) => (
                      <div key={index} className={`${getAlertColor(alert.type)} border rounded-lg p-3`}>
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getAlertIcon(alert.type)}</span>
                          <div className="flex-1">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm mt-1">{alert.message}</div>
                            <div className="text-xs mt-1 opacity-75">From: {alert.tracker}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {healthOverview.alerts.length > 3 && (
                      <div className="text-center">
                        <button
                          onClick={() => setShowAllAlerts(true)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          +{healthOverview.alerts.length - 3} more alerts
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insights */}
              {healthOverview.insights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">💡 Health Insights</h3>
                  <div className="space-y-3">
                    {healthOverview.insights.slice(0, 3).map((insight, index) => (
                      <div key={index} className={`${getAlertColor(insight.type)} border rounded-lg p-3`}>
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getAlertIcon(insight.type)}</span>
                          <div className="flex-1">
                            <div className="font-medium">{insight.title}</div>
                            <div className="text-sm mt-1">{insight.message}</div>
                            <div className="text-xs mt-1 opacity-75">From: {insight.tracker}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {healthOverview.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">🎯 Personalized Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthOverview.recommendations.slice(0, 4).map((rec, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-medium text-blue-800">{rec.title}</div>
                    <div className="text-sm text-blue-700 mt-1">{rec.message}</div>
                    <div className="text-xs text-blue-600 mt-2">Tracker: {rec.tracker}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">📋 Health Summary</h3>
            <div className="text-sm text-gray-700">
              {healthOverview.healthScore >= 80 && (
                <p>🎉 Excellent! Your health metrics are looking great. Keep up the good work with consistent tracking and healthy habits.</p>
              )}
              {healthOverview.healthScore >= 60 && healthOverview.healthScore < 80 && (
                <p>👍 Good progress! You're maintaining decent health metrics. Focus on addressing the highlighted areas for improvement.</p>
              )}
              {healthOverview.healthScore < 60 && (
                <p>⚠️ Your health metrics need attention. Please review the alerts and consider consulting with healthcare professionals for the highlighted concerns.</p>
              )}
              {healthOverview.activeTrackers === 0 && (
                <p>📱 Start your health journey by using our tracking tools below. Regular monitoring helps identify patterns and improve your wellbeing.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading your health overview...</span>
          </div>
        </div>
      )}

      {/* Health Report Download Section */}
      <HealthReportDownload />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trackers.map((tracker) => (
          <div
            key={tracker.id}
            onClick={() => handleCardClick(tracker.route)}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:scale-105"
          >
            <div className={`${tracker.color} text-white p-4 rounded-t-lg`}>
              <div className="text-center">
                <div className="text-4xl mb-2">{tracker.icon}</div>
                <h3 className="text-lg font-semibold">{tracker.title}</h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm">{tracker.description}</p>
              <div className="mt-4">
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-colors duration-200">
                  Open Tracker
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Why Use Health Trackers?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">📊</div>
            <div>
              <h3 className="font-medium text-blue-800">Track Progress</h3>
              <p className="text-blue-600 text-sm">Monitor your health metrics over time and identify patterns</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">⏰</div>
            <div>
              <h3 className="font-medium text-blue-800">Never Miss Important Dates</h3>
              <p className="text-blue-600 text-sm">Get reminders for vaccinations, check-ups, and medication</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">🎯</div>
            <div>
              <h3 className="font-medium text-blue-800">Early Detection</h3>
              <p className="text-blue-600 text-sm">Identify potential health issues before they become serious</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl">👨‍⚕️</div>
            <div>
              <h3 className="font-medium text-blue-800">Better Doctor Visits</h3>
              <p className="text-blue-600 text-sm">Share comprehensive health data with your healthcare provider</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-teal-500 text-xl">🤖</div>
            <div>
              <h3 className="font-medium text-blue-800">Smart Automation</h3>
              <p className="text-blue-600 text-sm">AI automatically tracks missed medications and updates your health reports</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-teal-500 text-xl">💊</div>
            <div>
              <h3 className="font-medium text-blue-800">Medication Adherence</h3>
              <p className="text-blue-600 text-sm">2-hour grace period before auto-marking missed doses - never lose track again</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Alerts Modal */}
      {showAllAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">All Health Alerts</h3>
              <button
                onClick={() => setShowAllAlerts(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {healthOverview?.alerts.map((alert, index) => (
                <div key={index} className={`${getAlertColor(alert.type)} border rounded-lg p-3`}>
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm mt-1">{alert.message}</div>
                      <div className="text-xs mt-1 opacity-75">From: {alert.tracker}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthTrackerCards;
