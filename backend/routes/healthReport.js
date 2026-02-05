const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const ChildVaccineTracker = require('../models/ChildVaccineTracker');
const PeriodTracker = require('../models/PeriodTracker');
const BPTracker = require('../models/BPTracker');
const DiabetesTracker = require('../models/DiabetesTracker');
const SleepTracker = require('../models/SleepTracker');
const MoodTracker = require('../models/MoodTracker');
const OverallHealthTracker = require('../models/OverallHealthTracker');
const MedicineTracker = require('../models/MedicineTracker');
const SubstanceUseTracker = require('../models/SubstanceUseTracker');
const FoodTracker = require('../models/FoodTracker');
const ExerciseTracker = require('../models/ExerciseTracker');
const CognitiveAssessment = require('../models/CognitiveAssessment');

const router = express.Router();

// Test route to check if health report generation is working
router.get('/test', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Simple test HTML
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Health Report Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Health Report Test</h1>
          <p>User: ${user.name}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div style="padding: 20px;">
          <h2>System Status</h2>
          <p>✅ Backend API is working</p>
          <p>✅ User authentication is working</p>
          <p>✅ Database connection is working</p>
          <p>✅ HTML generation is working</p>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(testHtml);
    
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ message: 'Test failed', error: error.message });
  }
});

// Generate comprehensive health report - Vercel compatible version
router.get('/download', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user information
    const user = await User.findById(userId).select('name email phone');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all health tracker data
    const [
      vaccineTracker,
      periodTracker,
      bpTracker,
      diabetesTracker,
      sleepTracker,
      moodTracker,
      overallTracker,
      medicineTracker,
      substanceTracker,
      foodTracker,
      exerciseTracker,
      cognitiveTracker
    ] = await Promise.allSettled([
      ChildVaccineTracker.findOne({ userId }),
      PeriodTracker.findOne({ userId }),
      BPTracker.findOne({ userId }),
      DiabetesTracker.findOne({ userId }),
      SleepTracker.findOne({ userId }),
      MoodTracker.findOne({ userId }),
      OverallHealthTracker.findOne({ userId }),
      MedicineTracker.findOne({ userId }),
      SubstanceUseTracker.findOne({ userId }),
      FoodTracker.findOne({ userId }),
      ExerciseTracker.findOne({ userId }),
      CognitiveAssessment.findOne({ userId })
    ]);

    // Process the data
    const healthData = {
      user: user,
      vaccines: vaccineTracker.status === 'fulfilled' ? vaccineTracker.value : null,
      period: periodTracker.status === 'fulfilled' ? periodTracker.value : null,
      bloodPressure: bpTracker.status === 'fulfilled' ? bpTracker.value : null,
      diabetes: diabetesTracker.status === 'fulfilled' ? diabetesTracker.value : null,
      sleep: sleepTracker.status === 'fulfilled' ? sleepTracker.value : null,
      mood: moodTracker.status === 'fulfilled' ? moodTracker.value : null,
      overall: overallTracker.status === 'fulfilled' ? overallTracker.value : null,
      medicine: medicineTracker.status === 'fulfilled' ? medicineTracker.value : null,
      substance: substanceTracker.status === 'fulfilled' ? substanceTracker.value : null,
      food: foodTracker.status === 'fulfilled' ? foodTracker.value : null,
      exercise: exerciseTracker.status === 'fulfilled' ? exerciseTracker.value : null,
      cognitive: cognitiveTracker.status === 'fulfilled' ? cognitiveTracker.value : null
    };

    console.log('Generating health report for user:', user.name);
    console.log('Available data:', Object.keys(healthData).filter(key => healthData[key] && key !== 'user'));
    
    // Try PDF generation first, fallback to HTML if it fails
    let browser;
    try {
      // Check if we're in a Vercel environment
      const isVercel = process.env.VERCEL || process.env.NOW_REGION;
      
      if (isVercel) {
        // Use chrome-aws-lambda for Vercel
        const chromium = require('chrome-aws-lambda');
        const puppeteer = require('puppeteer-core');
        
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        // Use regular puppeteer for local development
        const puppeteer = require('puppeteer');
        browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
      }
      
      const page = await browser.newPage();
      const htmlContent = generatePrintableHealthReportHTML(healthData);
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      // Validate PDF
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Empty PDF generated');
      }
      
      const pdfHeader = pdfBuffer.slice(0, 4);
      const isValidPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46;
      
      if (!isValidPDF) {
        throw new Error('Invalid PDF generated');
      }
      
      console.log('PDF generated successfully, size:', pdfBuffer.length);
      
      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Content-Disposition', `attachment; filename="health-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.end(pdfBuffer, 'binary');
      
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError.message);
      
      // Fallback to HTML with print-friendly styling
      const htmlContent = generatePrintableHealthReportHTML(healthData);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="health-report-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
      
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }

  } catch (error) {
    console.error('Error generating health report:', error);
    res.status(500).json({ 
      message: 'Server error generating health report', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
function generatePrintableHealthReportHTML(data) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Health Report - ${data.user.name}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: #fff;
                font-size: 14px;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                padding: 30px 20px 20px 20px;
                margin: -20px -20px 30px -20px;
                border-radius: 8px;
            }
            
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
            }
            
            .report-title {
                font-size: 24px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 10px;
            }
            
            .patient-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #2563eb;
            }
            
            .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                background: #fff;
            }
            
            .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #1f2937;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
                margin-bottom: 15px;
            }
            
            .data-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .data-item {
                background: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
            }
            
            .data-label {
                font-weight: bold;
                color: #374151;
                font-size: 13px;
            }
            
            .data-value {
                color: #6b7280;
                font-size: 13px;
                margin-top: 4px;
            }
            
            .analysis-box {
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                border-left: 4px solid;
            }
            
            .analysis-title {
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .risk-high { 
                background: #fef2f2; 
                border-color: #ef4444;
                color: #dc2626;
            }
            
            .risk-moderate { 
                background: #fef3c7; 
                border-color: #f59e0b;
                color: #d97706;
            }
            
            .risk-low { 
                background: #f0fdf4; 
                border-color: #22c55e;
                color: #16a34a;
            }
            
            .no-data {
                color: #9ca3af;
                font-style: italic;
                text-align: center;
                padding: 20px;
                background: #f9fafb;
                border-radius: 6px;
            }
            
            .detailed-list {
                background: #f8fafc;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 15px;
                margin: 10px 0;
            }
            
            .list-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
                font-size: 13px;
            }
            
            .list-item:last-child {
                border-bottom: none;
            }
            
            .highlight {
                background: #dbeafe;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 500;
                font-size: 12px;
            }
            
            .disclaimer {
                background: #fef2f2;
                border: 1px solid #ef4444;
                border-radius: 8px;
                padding: 20px;
                margin-top: 30px;
                text-align: center;
            }
            
            .disclaimer-title {
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 10px;
                font-size: 16px;
            }
            
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
            }
            
            .print-instructions {
                background: #e0f2fe;
                border: 1px solid #0369a1;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .print-button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                margin: 10px;
                transition: background-color 0.2s;
            }
            
            .print-button:hover {
                background: #1d4ed8;
            }
            
            @media print {
                body { 
                    margin: 0; 
                    padding: 15px; 
                    font-size: 12px;
                }
                .container {
                    max-width: none;
                    margin: 0;
                    padding: 0;
                }
                .print-instructions {
                    display: none;
                }
                .section { 
                    page-break-inside: avoid;
                    margin-bottom: 20px;
                }
                .header {
                    margin: 0 0 20px 0;
                    padding: 20px;
                }
            }
            
            @media screen {
                .container {
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    margin: 20px auto;
                    background: white;
                }
            }
        </style>
        <script>
            function printReport() {
                window.print();
            }
            
            function downloadAsPDF() {
                // Modern browsers support this
                if (window.chrome) {
                    window.print();
                } else {
                    alert('Please use Ctrl+P (Windows) or Cmd+P (Mac) to save as PDF');
                }
            }
        </script>
    </head>
    <body>
        <div class="container">
            <div class="print-instructions">
                <h3 style="color: #0369a1; margin-bottom: 10px;">📄 Save as PDF Instructions</h3>
                <p style="color: #0369a1; margin-bottom: 15px;">
                    This is your comprehensive health report. To save as PDF:
                </p>
                <button class="print-button" onclick="printReport()">🖨️ Print / Save as PDF</button>
                <p style="color: #0369a1; font-size: 12px; margin-top: 10px;">
                    In the print dialog, select "Save as PDF" as your destination
                </p>
            </div>

            <div class="header">
                <div class="logo">DrXConsult.in</div>
                <div style="color: #64748b; font-size: 14px; margin-bottom: 15px;">Comprehensive Healthcare Platform</div>
                <div class="report-title">Personal Health Report</div>
                <div style="color: #6b7280; font-size: 13px;">Generated on ${currentDate}</div>
            </div>

            <div class="patient-info">
                <h3 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">Patient Information</h3>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Name</div>
                        <div class="data-value">${data.user.name || 'N/A'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Email</div>
                        <div class="data-value">${data.user.email || 'N/A'}</div>
                    </div>
                </div>
                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #2563eb;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 16px; margin-right: 8px;">ℹ️</span>
                        <strong style="color: #1e40af; font-size: 14px;">Data Source Declaration</strong>
                    </div>
                    <p style="margin: 0; color: #1e40af; font-size: 12px;">
                        All health data in this report has been <strong>self-reported by the patient</strong> through the DrXConsult.in digital health tracking platform. 
                        This information represents the patient's personal health monitoring and should be reviewed by qualified healthcare professionals.
                    </p>
                </div>
            </div>

            ${generateCompactSummarySection(data)}
            ${generateCompactVaccineSection(data.vaccines)}
            ${generateCompactPeriodSection(data.period)}
            ${generateCompactBPSection(data.bloodPressure)}
            ${generateCompactDiabetesSection(data.diabetes)}
            ${generateCompactSleepSection(data.sleep)}
            ${generateCompactMoodSection(data.mood)}
            ${generateCompactOverallSection(data.overall)}
            ${generateCompactMedicineSection(data.medicine)}
            ${generateCompactSubstanceSection(data.substance)}
            ${generateCompactFoodSection(data.food)}
            ${generateCompactExerciseSection(data.exercise)}
            ${generateCompactCognitiveSection(data.cognitive)}

            <div class="disclaimer">
                <div class="disclaimer-title">⚠️ Medical Disclaimer</div>
                <p style="font-size: 13px;">This report contains self-reported health data provided by the patient through DrXConsult.in platform. This information is for reference purposes only and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical decisions.</p>
                <p style="font-size: 12px; margin-top: 10px;"><strong>Data Source:</strong> Patient self-reporting through digital health tracking tools</p>
            </div>

            <div class="footer">
                <p>Generated by DrXConsult.in Health Tracking Platform</p>
                <p>For medical consultations, visit www.drxconsult.in</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateFallbackHTML(data) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Health Report - ${data.user.name}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: #fff;
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
                background: #f0f9ff;
                padding: 30px 20px 20px 20px;
                margin: -20px -20px 30px -20px;
            }
            .error-notice {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                color: #856404;
            }
            .section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>DrXConsult.in</h1>
            <h2>Health Report</h2>
            <p>Patient: ${data.user.name}</p>
            <p>Generated: ${currentDate}</p>
        </div>

        <div class="error-notice">
            <h3>PDF Generation Issue</h3>
            <p>There was an issue generating the PDF version of your health report. This HTML version contains your health data. You can print this page (Ctrl+P) and save as PDF if needed.</p>
        </div>

        <div class="section">
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> ${data.user.name}</p>
            <p><strong>Email:</strong> ${data.user.email}</p>
        </div>

        <div class="section">
            <h3>Health Data Summary</h3>
            <p>This report would normally contain detailed information from all your health trackers including:</p>
            <ul>
                <li>Child Vaccination Records</li>
                <li>Period & PCOS Tracking</li>
                <li>Blood Pressure Monitoring</li>
                <li>Diabetes Management</li>
                <li>Sleep Pattern Analysis</li>
                <li>Mood Tracking</li>
                <li>Overall Health Assessment</li>
                <li>Medicine Adherence</li>
                <li>Substance Use Monitoring</li>
                <li>Indian Food Nutrition Analysis</li>
                <li>Exercise Activity Tracking</li>
                <li>Cognitive Assessment Results</li>
            </ul>
        </div>

        <div class="section">
            <h3>Next Steps</h3>
            <p>Please try downloading the report again. If the issue persists, contact support at DrXConsult.in</p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>Generated by DrXConsult.in Health Tracking Platform</p>
        </div>
    </body>
    </html>
  `;
}

function generateSummarySection(data) {
  const trackers = [
    { name: 'Child Vaccination', data: data.vaccines, key: 'children' },
    { name: 'Period & PCOS', data: data.period, key: 'pcosAssessments' },
    { name: 'Blood Pressure', data: data.bloodPressure, key: 'readings' },
    { name: 'Diabetes', data: data.diabetes, key: 'readings' },
    { name: 'Sleep', data: data.sleep, key: 'entries' },
    { name: 'Mood', data: data.mood, key: 'entries' },
    { name: 'Overall Health', data: data.overall, key: 'entries' },
    { name: 'Medicine', data: data.medicine, key: 'medicines' },
    { name: 'Substance Use', data: data.substance, key: 'entries' },
    { name: 'Indian Food Analyzer', data: data.food, key: 'meals' },
    { name: 'Exercise Tracker', data: data.exercise, key: 'exercises' },
    { name: 'Cognitive Assessment', data: data.cognitive, key: 'assessments' }
  ];

  const activeTrackers = trackers.filter(tracker => {
    if (!tracker.data) return false;
    const dataArray = tracker.data[tracker.key];
    return dataArray && dataArray.length > 0;
  });

  const totalDataPoints = activeTrackers.reduce((sum, tracker) => {
    const dataArray = tracker.data[tracker.key];
    return sum + (dataArray ? dataArray.length : 0);
  }, 0);

  // Calculate health score and insights
  const healthScore = calculateOverallHealthScore(data);
  const riskAlerts = generateHealthRiskAlerts(data);
  const trackingConsistency = calculateTrackingConsistency(activeTrackers);

  return `
    <div class="section">
      <div class="section-title">📊 Comprehensive Health Analytics Dashboard</div>
      
      <!-- Overall Health Score -->
      <div class="analysis-box" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #2563eb; margin-bottom: 20px;">
        <div class="analysis-title" style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">🎯 Overall Health Score</div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1;">
            <div style="font-size: 48px; font-weight: bold; color: ${healthScore >= 80 ? '#16a34a' : healthScore >= 60 ? '#f59e0b' : '#ef4444'};">
              ${healthScore}/100
            </div>
            <div style="color: #1e40af; font-weight: 500; margin-top: 5px;">
              ${healthScore >= 80 ? 'Excellent Health Management' : healthScore >= 60 ? 'Good Health Tracking' : 'Needs Improvement'}
            </div>
          </div>
          <div style="flex: 2; margin-left: 20px;">
            <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0f2fe;">
              <div style="font-weight: bold; color: #1e40af; margin-bottom: 8px;">Score Breakdown:</div>
              <div style="font-size: 13px; color: #1e40af;">
                • Data Completeness: ${Math.round((activeTrackers.length / trackers.length) * 100)}%<br>
                • Tracking Consistency: ${trackingConsistency}%<br>
                • Risk Management: ${100 - (riskAlerts.high * 20 + riskAlerts.moderate * 10)}%<br>
                • Health Engagement: ${Math.min(100, totalDataPoints * 2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Health Status Overview -->
      <div class="data-grid" style="margin-bottom: 20px;">
        <div class="data-item" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #16a34a;">
          <div class="data-label">Active Health Trackers</div>
          <div class="data-value" style="font-size: 18px; font-weight: bold; color: #16a34a;">${activeTrackers.length}/${trackers.length}</div>
          <div style="font-size: 11px; color: #16a34a; margin-top: 4px;">
            ${Math.round((activeTrackers.length / trackers.length) * 100)}% Coverage
          </div>
        </div>
        <div class="data-item" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b;">
          <div class="data-label">Total Health Data Points</div>
          <div class="data-value" style="font-size: 18px; font-weight: bold; color: #d97706;">${totalDataPoints}</div>
          <div style="font-size: 11px; color: #d97706; margin-top: 4px;">
            ${totalDataPoints > 100 ? 'Comprehensive' : totalDataPoints > 50 ? 'Good' : 'Basic'} Data Collection
          </div>
        </div>
      </div>

      <!-- Risk Alert Summary -->
      ${riskAlerts.high > 0 || riskAlerts.moderate > 0 ? `
        <div class="analysis-box ${riskAlerts.high > 0 ? 'risk-high' : 'risk-moderate'}" style="margin-bottom: 20px;">
          <div class="analysis-title">⚠️ Health Risk Alert Summary</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 10px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${riskAlerts.high}</div>
              <div style="font-size: 12px;">High Risk Areas</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${riskAlerts.moderate}</div>
              <div style="font-size: 12px;">Moderate Risk Areas</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${riskAlerts.low}</div>
              <div style="font-size: 12px;">Low Risk Areas</div>
            </div>
          </div>
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px;">
            <strong>Immediate Action Required:</strong> ${riskAlerts.high > 0 ? 'Consult healthcare provider for high-risk areas' : 'Monitor moderate-risk areas closely'}
          </div>
        </div>
      ` : `
        <div class="analysis-box risk-low" style="margin-bottom: 20px;">
          <div class="analysis-title">✅ Excellent Health Status</div>
          <div>No significant health risks detected. Continue maintaining your healthy lifestyle and regular monitoring.</div>
        </div>
      `}

      <!-- Tracking Consistency Analysis -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📈 Detailed Tracker Analysis</h5>
        ${trackers.map(tracker => {
          const isActive = activeTrackers.some(at => at.name === tracker.name);
          const dataArray = tracker.data?.[tracker.key];
          const dataCount = dataArray?.length || 0;
          const lastEntry = dataArray?.[dataArray.length - 1];
          const daysSinceLastEntry = lastEntry ? Math.floor((new Date() - new Date(lastEntry.date || lastEntry.createdAt || lastEntry.assessmentDate)) / (1000 * 60 * 60 * 24)) : null;
          
          return `
            <div class="list-item" style="align-items: flex-start; padding: 12px 0;">
              <div style="flex: 1;">
                <div style="font-weight: bold; color: ${isActive ? '#16a34a' : '#9ca3af'};">
                  ${isActive ? '✅' : '⭕'} ${tracker.name}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                  ${isActive ? `${dataCount} entries • Last: ${daysSinceLastEntry !== null ? `${daysSinceLastEntry} days ago` : 'Unknown'}` : 'No data available'}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="highlight" style="background: ${isActive ? '#dcfce7' : '#f3f4f6'}; color: ${isActive ? '#16a34a' : '#9ca3af'};">
                  ${isActive ? (daysSinceLastEntry <= 7 ? 'Active' : daysSinceLastEntry <= 30 ? 'Recent' : 'Inactive') : 'Not Started'}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Health Insights and Recommendations -->
      <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
        <div class="analysis-title" style="color: #1e40af;">💡 Personalized Health Insights</div>
        <div style="color: #1e40af;">
          ${generatePersonalizedInsights(data, activeTrackers, healthScore)}
        </div>
      </div>
    </div>
  `;
}

function calculateOverallHealthScore(data) {
  let score = 0;
  let maxScore = 0;

  // Data completeness (30 points)
  const trackers = ['vaccines', 'period', 'bloodPressure', 'diabetes', 'sleep', 'mood', 'overall', 'medicine', 'substance', 'food', 'exercise', 'cognitive'];
  const activeCount = trackers.filter(key => data[key] && Object.keys(data[key]).length > 0).length;
  score += (activeCount / trackers.length) * 30;
  maxScore += 30;

  // Risk management (40 points)
  let riskDeductions = 0;
  
  // BP risk
  if (data.bloodPressure?.readings?.length > 0) {
    const recent = data.bloodPressure.readings.slice(-5);
    const highBP = recent.filter(r => r.systolic > 140 || r.diastolic > 90).length;
    riskDeductions += (highBP / recent.length) * 10;
  }
  
  // Diabetes risk
  if (data.diabetes?.readings?.length > 0) {
    const recent = data.diabetes.readings.slice(-5);
    const abnormal = recent.filter(r => r.glucoseLevel > 180 || r.glucoseLevel < 70).length;
    riskDeductions += (abnormal / recent.length) * 10;
  }
  
  // Sleep quality
  if (data.sleep?.entries?.length > 0) {
    const recent = data.sleep.entries.slice(-7);
    const avgSleep = recent.reduce((sum, e) => sum + e.sleepDuration, 0) / recent.length;
    if (avgSleep < 6) riskDeductions += 10;
    else if (avgSleep >= 7 && avgSleep <= 9) score += 5;
  }
  
  // Substance use
  if (data.substance?.entries?.length > 0) {
    const recent = data.substance.entries.slice(-7);
    const smokingDays = recent.filter(e => e.smoking.cigarettes > 0).length;
    riskDeductions += (smokingDays / 7) * 15;
  }
  
  score += Math.max(0, 40 - riskDeductions);
  maxScore += 40;

  // Engagement and consistency (30 points)
  let totalEntries = 0;
  trackers.forEach(key => {
    if (data[key]) {
      const entries = data[key].readings || data[key].entries || data[key].meals || data[key].exercises || data[key].assessments || data[key].children || data[key].pcosAssessments || data[key].medicines || [];
      totalEntries += entries.length || 0;
    }
  });
  
  score += Math.min(30, totalEntries * 0.3);
  maxScore += 30;

  return Math.round((score / maxScore) * 100);
}

function generateHealthRiskAlerts(data) {
  let high = 0, moderate = 0, low = 0;

  // Blood Pressure
  if (data.bloodPressure?.readings?.length > 0) {
    const recent = data.bloodPressure.readings.slice(-5);
    const highBP = recent.filter(r => r.systolic > 140 || r.diastolic > 90).length;
    if (highBP > 2) high++;
    else if (highBP > 0) moderate++;
    else low++;
  }

  // Diabetes
  if (data.diabetes?.readings?.length > 0) {
    const recent = data.diabetes.readings.slice(-5);
    const abnormal = recent.filter(r => r.glucoseLevel > 180 || r.glucoseLevel < 70).length;
    if (abnormal > 2) high++;
    else if (abnormal > 0) moderate++;
    else low++;
  }

  // Sleep
  if (data.sleep?.entries?.length > 0) {
    const recent = data.sleep.entries.slice(-7);
    const avgSleep = recent.reduce((sum, e) => sum + e.sleepDuration, 0) / recent.length;
    if (avgSleep < 5) high++;
    else if (avgSleep < 6) moderate++;
    else low++;
  }

  // Mood
  if (data.mood?.entries?.length > 0) {
    const recent = data.mood.entries.slice(-7);
    const lowMoodDays = recent.filter(e => e.overallMood === 'sad' || e.overallMood === 'very_sad').length;
    if (lowMoodDays > 4) high++;
    else if (lowMoodDays > 2) moderate++;
    else low++;
  }

  // Substance Use
  if (data.substance?.entries?.length > 0) {
    const recent = data.substance.entries.slice(-7);
    const smokingDays = recent.filter(e => e.smoking.cigarettes > 0).length;
    if (smokingDays > 5) high++;
    else if (smokingDays > 0) moderate++;
    else low++;
  }

  return { high, moderate, low };
}

function calculateTrackingConsistency(activeTrackers) {
  if (activeTrackers.length === 0) return 0;
  
  let totalConsistency = 0;
  activeTrackers.forEach(tracker => {
    const dataArray = tracker.data[tracker.key];
    if (dataArray && dataArray.length > 0) {
      const lastEntry = dataArray[dataArray.length - 1];
      const daysSinceLastEntry = Math.floor((new Date() - new Date(lastEntry.date || lastEntry.createdAt || lastEntry.assessmentDate)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastEntry <= 3) totalConsistency += 100;
      else if (daysSinceLastEntry <= 7) totalConsistency += 80;
      else if (daysSinceLastEntry <= 14) totalConsistency += 60;
      else if (daysSinceLastEntry <= 30) totalConsistency += 40;
      else totalConsistency += 20;
    }
  });
  
  return Math.round(totalConsistency / activeTrackers.length);
}

function generatePersonalizedInsights(data, activeTrackers, healthScore) {
  const insights = [];
  
  // Overall performance insight
  if (healthScore >= 80) {
    insights.push("🌟 <strong>Excellent Health Management:</strong> You're maintaining outstanding health tracking habits with comprehensive data collection and low risk factors.");
  } else if (healthScore >= 60) {
    insights.push("👍 <strong>Good Health Awareness:</strong> You're on the right track with solid health monitoring. Focus on consistency and addressing moderate risk areas.");
  } else {
    insights.push("⚠️ <strong>Health Management Needs Attention:</strong> Consider increasing your health tracking frequency and addressing identified risk factors.");
  }

  // Specific tracker insights
  if (data.bloodPressure?.readings?.length > 0) {
    const recent = data.bloodPressure.readings.slice(-5);
    const avgSys = Math.round(recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((sum, r) => sum + r.diastolic, 0) / recent.length);
    
    if (avgSys > 140 || avgDia > 90) {
      insights.push("🩺 <strong>Blood Pressure Alert:</strong> Your average BP is elevated. Consider dietary changes, exercise, and consult your doctor.");
    } else if (avgSys < 120 && avgDia < 80) {
      insights.push("❤️ <strong>Excellent Blood Pressure:</strong> Your BP readings are in the optimal range. Keep up the healthy lifestyle!");
    }
  }

  if (data.exercise?.exercises?.length > 0) {
    const recent = data.exercise.exercises.slice(-7);
    const totalCalories = recent.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
    const exerciseDays = recent.length;
    
    if (exerciseDays >= 5) {
      insights.push("🏃‍♂️ <strong>Fitness Champion:</strong> Excellent exercise consistency! You burned " + totalCalories + " calories in the past week.");
    } else if (exerciseDays >= 3) {
      insights.push("💪 <strong>Good Exercise Routine:</strong> You're maintaining a decent workout schedule. Try to increase frequency for optimal health benefits.");
    } else {
      insights.push("🎯 <strong>Exercise Opportunity:</strong> Increasing physical activity could significantly improve your overall health score.");
    }
  }

  if (data.food?.meals?.length > 0) {
    const recent = data.food.meals.slice(-7);
    const avgCalories = Math.round(recent.reduce((sum, meal) => sum + meal.totalCalories, 0) / Math.min(recent.length, 7));
    const calorieGoal = data.food.userProfile?.dailyCalorieGoal || 2000;
    
    if (Math.abs(avgCalories - calorieGoal) <= 200) {
      insights.push("🍽️ <strong>Balanced Nutrition:</strong> Your calorie intake (" + avgCalories + " kcal/day) aligns well with your goals.");
    } else if (avgCalories > calorieGoal + 200) {
      insights.push("⚖️ <strong>Calorie Management:</strong> Consider portion control - you're averaging " + (avgCalories - calorieGoal) + " calories above your goal.");
    }
  }

  // Engagement insights
  if (activeTrackers.length >= 8) {
    insights.push("📊 <strong>Comprehensive Health Monitoring:</strong> You're tracking " + activeTrackers.length + " health areas - this provides excellent insights for healthcare decisions.");
  } else if (activeTrackers.length >= 5) {
    insights.push("📈 <strong>Good Health Awareness:</strong> Consider adding more trackers to get a complete picture of your health status.");
  } else {
    insights.push("🎯 <strong>Expand Your Health Tracking:</strong> Adding more health trackers would provide better insights and improve your health management.");
  }

  return insights.map(insight => `<div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">${insight}</div>`).join('');
}

function generateVaccineSection(vaccines) {
  if (!vaccines || !vaccines.children || vaccines.children.length === 0) {
    return `
      <div class="section">
        <div class="section-title">👶 Child Vaccination Tracker</div>
        <div class="no-data">No vaccination data available</div>
      </div>
    `;
  }

  let content = `
    <div class="section">
      <div class="section-title">👶 Child Vaccination Tracker</div>
  `;

  vaccines.children.forEach(child => {
    const completedVaccines = child.vaccines?.filter(v => v.isCompleted).length || 0;
    const totalVaccines = child.vaccines?.length || 0;
    const completionRate = totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0;
    const overdueVaccines = child.vaccines?.filter(v => !v.isCompleted && new Date(v.dueDate) < new Date()).length || 0;

    content += `
      <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
        <h4 style="margin-top: 0; color: #1f2937;">${child.babyName}</h4>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Date of Birth</div>
            <div class="data-value">${new Date(child.dateOfBirth).toLocaleDateString()}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Vaccination Progress</div>
            <div class="data-value">${completedVaccines}/${totalVaccines} (${completionRate}%)</div>
          </div>
        </div>
        ${overdueVaccines > 0 ? `
          <div class="analysis-box risk-high">
            <div class="analysis-title">⚠️ Overdue Vaccinations</div>
            <div>${overdueVaccines} vaccination(s) are overdue. Please consult your pediatrician immediately.</div>
          </div>
        ` : ''}
        ${child.vaccines && child.vaccines.length > 0 ? `
          <div class="detailed-list">
            <h5 style="margin-top: 0;">Vaccination Schedule:</h5>
            ${child.vaccines.map(vaccine => `
              <div class="list-item">
                <span>${vaccine.vaccineName}</span>
                <span class="${vaccine.isCompleted ? 'highlight' : ''}" style="background: ${vaccine.isCompleted ? '#dcfce7' : '#fef3c7'}; color: ${vaccine.isCompleted ? '#166534' : '#92400e'};">
                  ${vaccine.isCompleted ? '✅ Completed' : `Due: ${new Date(vaccine.dueDate).toLocaleDateString()}`}
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  });

  content += `</div>`;
  return content;
}
function generatePeriodSection(period) {
  if (!period || !period.pcosAssessments || period.pcosAssessments.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🌸 Period & PCOS Tracker</div>
        <div class="no-data">No period/PCOS data available</div>
      </div>
    `;
  }

  const latest = period.pcosAssessments[period.pcosAssessments.length - 1];
  const riskClass = latest.riskLevel === 'High' ? 'risk-high' : 
                   latest.riskLevel === 'Moderate' ? 'risk-moderate' : 'risk-low';

  return `
    <div class="section">
      <div class="section-title">🌸 Period & PCOS Tracker</div>
      <div class="analysis-box ${riskClass}">
        <div class="analysis-title">Latest PCOS Risk Assessment</div>
        <div><strong>Risk Level:</strong> ${latest.riskLevel}</div>
        <div><strong>Score:</strong> ${latest.totalScore}/23</div>
        <div><strong>Assessment Date:</strong> ${new Date(latest.assessmentDate).toLocaleDateString()}</div>
      </div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">BMI</div>
          <div class="data-value">${latest.bmi || 'N/A'}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Cycle Length</div>
          <div class="data-value">${latest.cycleLength || 'N/A'} days</div>
        </div>
      </div>
      ${period.pcosAssessments.length > 1 ? `
        <div class="detailed-list">
          <h5 style="margin-top: 15px;">Assessment History:</h5>
          ${period.pcosAssessments.slice(-5).map(assessment => `
            <div class="list-item">
              <span>${new Date(assessment.assessmentDate).toLocaleDateString()}</span>
              <span class="highlight" style="background: ${assessment.riskLevel === 'High' ? '#fef2f2' : assessment.riskLevel === 'Moderate' ? '#fef3c7' : '#f0fdf4'};">
                ${assessment.riskLevel} Risk (${assessment.totalScore}/23)
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function generateBPSection(bp) {
  if (!bp || !bp.readings || bp.readings.length === 0) {
    return `
      <div class="section">
        <div class="section-title">❤️ Blood Pressure Comprehensive Analysis</div>
        <div class="no-data">No blood pressure data available. Regular BP monitoring is crucial for cardiovascular health.</div>
        <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
          <div class="analysis-title" style="color: #1e40af;">📋 Recommended BP Monitoring Guidelines</div>
          <div style="color: #1e40af;">
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>Check BP at least once weekly if you have normal readings</li>
              <li>Daily monitoring if you have hypertension or are on medication</li>
              <li>Record readings at the same time each day</li>
              <li>Avoid caffeine and exercise 30 minutes before measuring</li>
              <li>Take multiple readings and record the average</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  const allReadings = bp.readings;
  const recentReadings = allReadings.slice(-10);
  const last30Days = allReadings.filter(r => new Date(r.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const last90Days = allReadings.filter(r => new Date(r.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

  // Calculate comprehensive statistics
  const avgSystolic = Math.round(recentReadings.reduce((sum, r) => sum + r.systolic, 0) / recentReadings.length);
  const avgDiastolic = Math.round(recentReadings.reduce((sum, r) => sum + r.diastolic, 0) / recentReadings.length);
  
  const maxSystolic = Math.max(...recentReadings.map(r => r.systolic));
  const minSystolic = Math.min(...recentReadings.map(r => r.systolic));
  const maxDiastolic = Math.max(...recentReadings.map(r => r.diastolic));
  const minDiastolic = Math.min(...recentReadings.map(r => r.diastolic));

  // BP Categories
  const normalCount = recentReadings.filter(r => r.systolic < 120 && r.diastolic < 80).length;
  const elevatedCount = recentReadings.filter(r => r.systolic >= 120 && r.systolic <= 129 && r.diastolic < 80).length;
  const stage1Count = recentReadings.filter(r => (r.systolic >= 130 && r.systolic <= 139) || (r.diastolic >= 80 && r.diastolic <= 89)).length;
  const stage2Count = recentReadings.filter(r => r.systolic >= 140 || r.diastolic >= 90).length;
  const crisisCount = recentReadings.filter(r => r.systolic > 180 || r.diastolic > 120).length;

  // Trend analysis
  const trend = calculateBPTrend(recentReadings);
  const variability = calculateBPVariability(recentReadings);

  // Risk assessment
  const riskLevel = assessBPRisk(avgSystolic, avgDiastolic, stage1Count + stage2Count + crisisCount, recentReadings.length);

  let content = `
    <div class="section">
      <div class="section-title">❤️ Blood Pressure Comprehensive Analysis</div>
      
      <!-- Current Status Overview -->
      <div class="analysis-box" style="background: linear-gradient(135deg, ${riskLevel === 'High' ? '#fef2f2' : riskLevel === 'Moderate' ? '#fef3c7' : '#f0fdf4'} 0%, ${riskLevel === 'High' ? '#fee2e2' : riskLevel === 'Moderate' ? '#fde68a' : '#dcfce7'} 100%); border: 2px solid ${riskLevel === 'High' ? '#ef4444' : riskLevel === 'Moderate' ? '#f59e0b' : '#16a34a'}; margin-bottom: 20px;">
        <div class="analysis-title" style="color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Moderate' ? '#d97706' : '#16a34a'}; font-size: 18px;">
          🎯 Current Blood Pressure Status: ${riskLevel} Risk
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
          <div style="text-align: center;">
            <div style="font-size: 36px; font-weight: bold; color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Moderate' ? '#d97706' : '#16a34a'};">
              ${avgSystolic}/${avgDiastolic}
            </div>
            <div style="font-size: 14px; color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Moderate' ? '#d97706' : '#16a34a'}; font-weight: 500;">
              Average BP (mmHg)
            </div>
          </div>
          <div style="flex: 1; margin-left: 20px;">
            <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px; color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Moderate' ? '#d97706' : '#16a34a'};">
                Classification: ${getBPClassification(avgSystolic, avgDiastolic)}
              </div>
              <div style="font-size: 13px; color: ${riskLevel === 'High' ? '#dc2626' : riskLevel === 'Moderate' ? '#d97706' : '#16a34a'};">
                Range: ${minSystolic}-${maxSystolic}/${minDiastolic}-${maxDiastolic} mmHg<br>
                Trend: ${trend.direction} (${trend.change} mmHg/week)<br>
                Variability: ${variability.level} (${variability.coefficient}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Statistics -->
      <div class="data-grid" style="margin-bottom: 20px;">
        <div class="data-item">
          <div class="data-label">Total Readings</div>
          <div class="data-value">${allReadings.length}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            Last 30 days: ${last30Days.length} | Last 90 days: ${last90Days.length}
          </div>
        </div>
        <div class="data-item">
          <div class="data-label">Monitoring Frequency</div>
          <div class="data-value">${calculateMonitoringFrequency(allReadings)}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            ${getFrequencyRecommendation(avgSystolic, avgDiastolic)}
          </div>
        </div>
      </div>

      <!-- BP Category Distribution -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📊 Blood Pressure Category Distribution (Last 10 Readings)</h5>
        <div class="list-item">
          <span>🟢 Normal (<120/80)</span>
          <span class="highlight" style="background: #dcfce7; color: #16a34a;">
            ${normalCount} readings (${Math.round((normalCount/recentReadings.length)*100)}%)
          </span>
        </div>
        <div class="list-item">
          <span>🟡 Elevated (120-129/<80)</span>
          <span class="highlight" style="background: #fef3c7; color: #d97706;">
            ${elevatedCount} readings (${Math.round((elevatedCount/recentReadings.length)*100)}%)
          </span>
        </div>
        <div class="list-item">
          <span>🟠 Stage 1 Hypertension (130-139/80-89)</span>
          <span class="highlight" style="background: #fed7aa; color: #ea580c;">
            ${stage1Count} readings (${Math.round((stage1Count/recentReadings.length)*100)}%)
          </span>
        </div>
        <div class="list-item">
          <span>🔴 Stage 2 Hypertension (≥140/90)</span>
          <span class="highlight" style="background: #fecaca; color: #dc2626;">
            ${stage2Count} readings (${Math.round((stage2Count/recentReadings.length)*100)}%)
          </span>
        </div>
        ${crisisCount > 0 ? `
        <div class="list-item">
          <span>🚨 Hypertensive Crisis (>180/120)</span>
          <span class="highlight" style="background: #fca5a5; color: #991b1b;">
            ${crisisCount} readings (${Math.round((crisisCount/recentReadings.length)*100)}%) - EMERGENCY
          </span>
        </div>
        ` : ''}
      </div>
  `;

  // Risk factors and lifestyle assessment
  if (bp.lifestyleAssessment) {
    const assessment = bp.lifestyleAssessment;
    content += `
      <div class="analysis-box ${assessment.riskLevel === 'High' ? 'risk-high' : assessment.riskLevel === 'Moderate' ? 'risk-moderate' : 'risk-low'}" style="margin-bottom: 20px;">
        <div class="analysis-title">🎯 Comprehensive Lifestyle Risk Assessment</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
          <div>
            <div><strong>Overall Risk Level:</strong> ${assessment.riskLevel}</div>
            <div><strong>Risk Score:</strong> ${assessment.riskScore}/100</div>
            <div><strong>Primary Risk Factors:</strong></div>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
              ${assessment.riskFactors?.slice(0, 5).map(factor => `<li>${factor}</li>`).join('') || '<li>No specific risk factors identified</li>'}
            </ul>
          </div>
          <div>
            <div><strong>Protective Factors:</strong></div>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
              ${assessment.protectiveFactors?.slice(0, 5).map(factor => `<li>${factor}</li>`).join('') || '<li>Regular monitoring</li>'}
            </ul>
          </div>
        </div>
        ${assessment.recommendations && assessment.recommendations.length > 0 ? `
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px;">
            <strong>Personalized Recommendations:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
              ${assessment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Detailed readings history
  content += `
    <div class="detailed-list" style="margin-bottom: 20px;">
      <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📈 Recent Blood Pressure Readings</h5>
      ${recentReadings.map((reading, index) => {
        const classification = getBPClassification(reading.systolic, reading.diastolic);
        const isHigh = reading.systolic >= 140 || reading.diastolic >= 90;
        const isCritical = reading.systolic > 180 || reading.diastolic > 120;
        
        return `
          <div class="list-item" style="align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: ${isCritical ? '#991b1b' : isHigh ? '#dc2626' : '#16a34a'};">
                ${new Date(reading.date).toLocaleDateString()} ${new Date(reading.date).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                ${classification} ${reading.notes ? `• ${reading.notes}` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: bold; color: ${isCritical ? '#991b1b' : isHigh ? '#dc2626' : '#16a34a'};">
                ${reading.systolic}/${reading.diastolic}
              </div>
              <div style="font-size: 11px; color: ${isCritical ? '#991b1b' : isHigh ? '#dc2626' : '#16a34a'};">
                ${isCritical ? '🚨 CRISIS' : isHigh ? '⚠️ HIGH' : '✅ NORMAL'}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Clinical insights and recommendations
  content += `
    <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6; margin-bottom: 20px;">
      <div class="analysis-title" style="color: #1e40af;">🏥 Clinical Insights & Medical Recommendations</div>
      <div style="color: #1e40af;">
        ${generateBPClinicalInsights(avgSystolic, avgDiastolic, trend, variability, stage2Count + crisisCount, recentReadings.length)}
      </div>
    </div>
  `;

  // Target goals and progress
  content += `
    <div class="analysis-box" style="background: #f0fdf4; border-color: #16a34a;">
      <div class="analysis-title" style="color: #16a34a;">🎯 Blood Pressure Goals & Progress Tracking</div>
      <div style="color: #16a34a;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Target BP Goals</div>
            <div style="font-size: 13px;">
              • Normal: <120/80 mmHg<br>
              • Pre-hypertension: 120-139/80-89 mmHg<br>
              • Your Current: ${avgSystolic}/${avgDiastolic} mmHg<br>
              • Goal Achievement: ${normalCount > recentReadings.length/2 ? '✅ On Track' : '⚠️ Needs Improvement'}
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Progress Indicators</div>
            <div style="font-size: 13px;">
              • Consistency: ${recentReadings.length >= 10 ? '✅ Excellent' : recentReadings.length >= 5 ? '👍 Good' : '⚠️ Improve'}<br>
              • Trend: ${trend.direction === 'Improving' ? '✅' : trend.direction === 'Stable' ? '👍' : '⚠️'} ${trend.direction}<br>
              • Control: ${(normalCount + elevatedCount) > recentReadings.length/2 ? '✅ Good' : '⚠️ Poor'}<br>
              • Risk Level: ${riskLevel === 'Low' ? '✅' : riskLevel === 'Moderate' ? '👍' : '⚠️'} ${riskLevel}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content += `</div>`;
  return content;
}

function getBPClassification(systolic, diastolic) {
  if (systolic > 180 || diastolic > 120) return 'Hypertensive Crisis';
  if (systolic >= 140 || diastolic >= 90) return 'Stage 2 Hypertension';
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return 'Stage 1 Hypertension';
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return 'Elevated';
  return 'Normal';
}

function calculateBPTrend(readings) {
  if (readings.length < 3) return { direction: 'Insufficient data', change: 0 };
  
  const recent = readings.slice(-5);
  const older = readings.slice(-10, -5);
  
  if (older.length === 0) return { direction: 'Insufficient data', change: 0 };
  
  const recentAvg = recent.reduce((sum, r) => sum + r.systolic + r.diastolic, 0) / (recent.length * 2);
  const olderAvg = older.reduce((sum, r) => sum + r.systolic + r.diastolic, 0) / (older.length * 2);
  
  const change = Math.round((recentAvg - olderAvg) * 10) / 10;
  
  if (change > 5) return { direction: 'Worsening', change: Math.abs(change) };
  if (change < -5) return { direction: 'Improving', change: Math.abs(change) };
  return { direction: 'Stable', change: Math.abs(change) };
}

function calculateBPVariability(readings) {
  if (readings.length < 3) return { level: 'Unknown', coefficient: 0 };
  
  const systolicValues = readings.map(r => r.systolic);
  const mean = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
  const variance = systolicValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / systolicValues.length;
  const stdDev = Math.sqrt(variance);
  const coefficient = Math.round((stdDev / mean) * 100);
  
  let level = 'Low';
  if (coefficient > 15) level = 'High';
  else if (coefficient > 10) level = 'Moderate';
  
  return { level, coefficient };
}

function assessBPRisk(avgSys, avgDia, highReadings, totalReadings) {
  if (avgSys > 160 || avgDia > 100 || highReadings > totalReadings * 0.7) return 'High';
  if (avgSys > 140 || avgDia > 90 || highReadings > totalReadings * 0.3) return 'Moderate';
  return 'Low';
}

function calculateMonitoringFrequency(readings) {
  if (readings.length < 2) return 'Insufficient data';
  
  const dates = readings.map(r => new Date(r.date)).sort((a, b) => a - b);
  const intervals = [];
  
  for (let i = 1; i < dates.length; i++) {
    intervals.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
  }
  
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  
  if (avgInterval <= 1) return 'Daily';
  if (avgInterval <= 3) return 'Every 2-3 days';
  if (avgInterval <= 7) return 'Weekly';
  if (avgInterval <= 14) return 'Bi-weekly';
  return 'Monthly or less';
}

function getFrequencyRecommendation(avgSys, avgDia) {
  if (avgSys > 160 || avgDia > 100) return 'Recommend: Daily monitoring';
  if (avgSys > 140 || avgDia > 90) return 'Recommend: 3-4 times per week';
  if (avgSys > 120 || avgDia > 80) return 'Recommend: Weekly monitoring';
  return 'Recommend: Monthly monitoring';
}

function generateBPClinicalInsights(avgSys, avgDia, trend, variability, highCount, totalCount) {
  const insights = [];
  
  // Primary assessment
  if (avgSys > 180 || avgDia > 120) {
    insights.push("🚨 <strong>URGENT:</strong> Hypertensive crisis detected. Seek immediate medical attention.");
  } else if (avgSys >= 140 || avgDia >= 90) {
    insights.push("⚠️ <strong>Hypertension Diagnosis:</strong> Your average BP indicates Stage 2 hypertension. Consult your physician for treatment options.");
  } else if (avgSys >= 130 || avgDia >= 80) {
    insights.push("📋 <strong>Pre-hypertension:</strong> Your BP is elevated. Lifestyle modifications can prevent progression to hypertension.");
  } else {
    insights.push("✅ <strong>Normal Blood Pressure:</strong> Your current BP readings are within healthy ranges. Continue monitoring.");
  }

  // Trend analysis
  if (trend.direction === 'Worsening') {
    insights.push("📈 <strong>Concerning Trend:</strong> Your BP has increased by " + trend.change + " mmHg recently. Review lifestyle factors and consult your doctor.");
  } else if (trend.direction === 'Improving') {
    insights.push("📉 <strong>Positive Trend:</strong> Your BP has improved by " + trend.change + " mmHg. Continue current management strategies.");
  }

  // Variability assessment
  if (variability.level === 'High') {
    insights.push("📊 <strong>High BP Variability:</strong> Your readings vary significantly (" + variability.coefficient + "%). This may indicate poor BP control or measurement inconsistencies.");
  }

  // Control assessment
  const controlRate = Math.round(((totalCount - highCount) / totalCount) * 100);
  if (controlRate < 50) {
    insights.push("🎯 <strong>Poor BP Control:</strong> Only " + controlRate + "% of readings are controlled. Consider medication adjustment or lifestyle changes.");
  } else if (controlRate >= 80) {
    insights.push("🎯 <strong>Excellent BP Control:</strong> " + controlRate + "% of readings are well-controlled. Maintain current management approach.");
  }

  // Specific recommendations
  if (avgSys >= 140 || avgDia >= 90) {
    insights.push("💊 <strong>Treatment Considerations:</strong> May benefit from antihypertensive medication, dietary changes (DASH diet), regular exercise, and stress management.");
  }

  return insights.map(insight => `<div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(59, 130, 246, 0.2);">${insight}</div>`).join('');
}
function generateDiabetesSection(diabetes) {
  if (!diabetes || !diabetes.readings || diabetes.readings.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🩺 Diabetes Tracker</div>
        <div class="no-data">No diabetes data available</div>
      </div>
    `;
  }

  const recentReadings = diabetes.readings.slice(-10);
  const avgGlucose = Math.round(recentReadings.reduce((sum, r) => sum + r.glucoseLevel, 0) / recentReadings.length);
  const highGlucoseCount = recentReadings.filter(r => r.glucoseLevel > 180).length;
  const lowGlucoseCount = recentReadings.filter(r => r.glucoseLevel < 70).length;

  let content = `
    <div class="section">
      <div class="section-title">🩺 Diabetes Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Readings</div>
          <div class="data-value">${diabetes.readings.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Average Glucose (Recent 10)</div>
          <div class="data-value">${avgGlucose} mg/dL</div>
        </div>
      </div>
  `;

  if (highGlucoseCount > 0 || lowGlucoseCount > 0) {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Glucose Level Alert</div>
        <div>
          ${highGlucoseCount > 0 ? `${highGlucoseCount} high glucose readings (>180 mg/dL). ` : ''}
          ${lowGlucoseCount > 0 ? `${lowGlucoseCount} low glucose readings (<70 mg/dL). ` : ''}
          Please consult your healthcare provider.
        </div>
      </div>
    `;
  }

  // Add lifestyle risk assessment if available
  if (diabetes.lifestyleAssessment) {
    const assessment = diabetes.lifestyleAssessment;
    content += `
      <div class="analysis-box ${assessment.riskLevel === 'High' ? 'risk-high' : assessment.riskLevel === 'Moderate' ? 'risk-moderate' : 'risk-low'}">
        <div class="analysis-title">🎯 Diabetes Risk Assessment</div>
        <div><strong>Risk Level:</strong> ${assessment.riskLevel}</div>
        <div><strong>Risk Score:</strong> ${assessment.riskScore}/100</div>
        ${assessment.recommendations && assessment.recommendations.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong>Recommendations:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${assessment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Readings:</h5>
        ${recentReadings.map(reading => `
          <div class="list-item">
            <span>${new Date(reading.date).toLocaleDateString()} - ${reading.testType}</span>
            <span class="highlight" style="background: ${reading.glucoseLevel > 180 || reading.glucoseLevel < 70 ? '#fef2f2' : '#f0fdf4'};">
              ${reading.glucoseLevel} mg/dL
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
}

function generateSleepSection(sleep) {
  if (!sleep || !sleep.entries || sleep.entries.length === 0) {
    return `
      <div class="section">
        <div class="section-title">😴 Sleep Tracker</div>
        <div class="no-data">No sleep data available</div>
      </div>
    `;
  }

  const recentEntries = sleep.entries.slice(-7);
  const avgSleep = (recentEntries.reduce((sum, e) => sum + e.sleepDuration, 0) / recentEntries.length).toFixed(1);
  const poorSleepDays = recentEntries.filter(e => e.sleepQuality === 'poor' || e.sleepQuality === 'fair').length;

  let content = `
    <div class="section">
      <div class="section-title">😴 Sleep Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Entries</div>
          <div class="data-value">${sleep.entries.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Average Sleep (Last 7 days)</div>
          <div class="data-value">${avgSleep} hours</div>
        </div>
      </div>
  `;

  if (avgSleep < 6) {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Insufficient Sleep</div>
        <div>Your average sleep duration (${avgSleep} hours) is below the recommended 7-9 hours. Consider improving sleep hygiene.</div>
      </div>
    `;
  } else if (avgSleep >= 7 && avgSleep <= 9) {
    content += `
      <div class="analysis-box risk-low">
        <div class="analysis-title">✅ Good Sleep Duration</div>
        <div>Your average sleep duration (${avgSleep} hours) is within the healthy range of 7-9 hours.</div>
      </div>
    `;
  }

  content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Sleep Log:</h5>
        ${recentEntries.map(entry => `
          <div class="list-item">
            <span>${new Date(entry.date).toLocaleDateString()}</span>
            <span class="highlight" style="background: ${entry.sleepQuality === 'poor' || entry.sleepQuality === 'fair' ? '#fef3c7' : '#f0fdf4'};">
              ${entry.sleepDuration}h - ${entry.sleepQuality}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
}
function generateMoodSection(mood) {
  if (!mood || !mood.entries || mood.entries.length === 0) {
    return `
      <div class="section">
        <div class="section-title">😊 Mood Tracker</div>
        <div class="no-data">No mood data available</div>
      </div>
    `;
  }

  const recentEntries = mood.entries.slice(-7);
  const lowMoodDays = recentEntries.filter(e => e.overallMood === 'sad' || e.overallMood === 'very_sad').length;
  const highStressDays = recentEntries.filter(e => e.stressLevel === 'high' || e.stressLevel === 'very_high').length;

  let content = `
    <div class="section">
      <div class="section-title">😊 Mood Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Entries</div>
          <div class="data-value">${mood.entries.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Tracking Period</div>
          <div class="data-value">${Math.ceil((new Date() - new Date(mood.createdAt)) / (1000 * 60 * 60 * 24))} days</div>
        </div>
      </div>
  `;

  if (lowMoodDays > 3) {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Mood Concerns</div>
        <div>${lowMoodDays} days of low mood in the past week. Consider speaking with a mental health professional.</div>
      </div>
    `;
  }

  if (highStressDays > 4) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">🎯 Stress Management Needed</div>
        <div>${highStressDays} days of high stress. Consider stress reduction techniques and relaxation practices.</div>
      </div>
    `;
  }

  content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Mood Log:</h5>
        ${recentEntries.map(entry => `
          <div class="list-item">
            <span>${new Date(entry.date).toLocaleDateString()}</span>
            <span class="highlight" style="background: ${entry.overallMood === 'sad' || entry.overallMood === 'very_sad' ? '#fef2f2' : '#f0fdf4'};">
              ${entry.overallMood?.replace('_', ' ')} - Stress: ${entry.stressLevel?.replace('_', ' ')}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
}

function generateOverallSection(overall) {
  if (!overall || !overall.entries || overall.entries.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🏥 Overall Health Tracker</div>
        <div class="no-data">No overall health data available</div>
      </div>
    `;
  }

  const recentEntries = overall.entries.slice(-5);
  const symptomsPresent = recentEntries.some(entry => 
    Object.values(entry.symptoms || {}).some(symptom => 
      (symptom.severity && symptom.severity !== 'none') || 
      (symptom.temperature && symptom.temperature > 99)
    )
  );

  let content = `
    <div class="section">
      <div class="section-title">🏥 Overall Health Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Entries</div>
          <div class="data-value">${overall.entries.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Last Entry</div>
          <div class="data-value">${new Date(overall.entries[overall.entries.length - 1].date).toLocaleDateString()}</div>
        </div>
      </div>
  `;

  if (symptomsPresent) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">ℹ️ Recent Symptoms</div>
        <div>Symptoms have been tracked in recent entries. Review the detailed log below and consult healthcare provider if symptoms persist.</div>
      </div>
    `;
  }

  content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Health Log:</h5>
        ${recentEntries.map(entry => `
          <div class="list-item">
            <span>${new Date(entry.date).toLocaleDateString()}</span>
            <span class="highlight">
              Wellbeing: ${entry.overallWellbeing?.replace('_', ' ') || 'N/A'}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
}
function generateMedicineSection(medicine) {
  if (!medicine || !medicine.medicines || medicine.medicines.length === 0) {
    return `
      <div class="section">
        <div class="section-title">💊 Medicine Tracker</div>
        <div class="no-data">No medicine data available</div>
      </div>
    `;
  }

  const activeMeds = medicine.medicines.filter(med => med.isActive);
  const recentLog = medicine.medicineLog?.slice(-10) || [];
  const missedDoses = recentLog.filter(log => log.status === 'missed').length;
  const takenDoses = recentLog.filter(log => log.status === 'taken').length;
  const totalDoses = recentLog.length;

  let content = `
    <div class="section">
      <div class="section-title">💊 Medicine Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Active Medications</div>
          <div class="data-value">${activeMeds.length}</div>
        </div>
  `;

  if (totalDoses > 0) {
    const adherenceRate = Math.round((takenDoses / totalDoses) * 100);
    content += `
        <div class="data-item">
          <div class="data-label">Adherence Rate (Recent)</div>
          <div class="data-value">${adherenceRate}%</div>
        </div>
    `;

    if (adherenceRate < 80) {
      content += `
      </div>
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Low Medication Adherence</div>
        <div>Your adherence rate is ${adherenceRate}% with ${missedDoses} missed doses recently. Consistent medication adherence is crucial for treatment effectiveness.</div>
      </div>
      `;
    } else if (adherenceRate >= 95) {
      content += `
      </div>
      <div class="analysis-box risk-low">
        <div class="analysis-title">✅ Excellent Adherence</div>
        <div>Your medication adherence rate is ${adherenceRate}%. Keep up the excellent work!</div>
      </div>
      `;
    } else {
      content += `</div>`;
    }
  } else {
    content += `</div>`;
  }

  if (activeMeds.length > 0) {
    content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Active Medications:</h5>
        ${activeMeds.map(med => `
          <div class="list-item">
            <div>
              <strong>${med.medicineName}</strong><br>
              <small>${med.purpose} | ${med.dosage} | ${med.frequency}</small>
            </div>
            <span class="highlight">
              ${new Date(med.startDate).toLocaleDateString()} to ${new Date(med.endDate).toLocaleDateString()}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (recentLog.length > 0) {
    content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Medication Log:</h5>
        ${recentLog.map(log => `
          <div class="list-item">
            <span>${new Date(log.date).toLocaleDateString()} - ${log.medicineName}</span>
            <span class="highlight" style="background: ${log.status === 'missed' ? '#fef2f2' : '#f0fdf4'};">
              ${log.status === 'taken' ? '✅ Taken' : '❌ Missed'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }

  content += `</div>`;
  return content;
}

function generateSubstanceSection(substance) {
  if (!substance || !substance.entries || substance.entries.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🚭 Substance Use Tracker</div>
        <div class="no-data">No substance use data available</div>
      </div>
    `;
  }

  const recentEntries = substance.entries.slice(-7);
  const smokingDays = recentEntries.filter(e => e.smoking.cigarettes > 0 || e.smoking.cigars > 0).length;
  const drinkingDays = recentEntries.filter(e => e.alcohol.beer > 0 || e.alcohol.wine > 0 || e.alcohol.spirits > 0).length;
  const totalCigarettes = recentEntries.reduce((sum, e) => sum + e.smoking.cigarettes, 0);
  const totalAlcoholUnits = recentEntries.reduce((sum, e) => 
    sum + e.alcohol.beer + e.alcohol.wine + (e.alcohol.spirits * 1.5), 0
  );

  let content = `
    <div class="section">
      <div class="section-title">🚭 Substance Use Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Entries</div>
          <div class="data-value">${substance.entries.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Recent Activity (7 days)</div>
          <div class="data-value">${smokingDays} smoking, ${drinkingDays} drinking days</div>
        </div>
      </div>
  `;

  if (smokingDays > 0) {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Smoking Activity</div>
        <div>${smokingDays} smoking days with ${totalCigarettes} cigarettes in the past week. Consider quit strategies and professional support.</div>
      </div>
    `;
  }

  if (totalAlcoholUnits > 14) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">🍷 High Alcohol Consumption</div>
        <div>${totalAlcoholUnits.toFixed(1)} units consumed in the past week exceeds the recommended weekly limit of 14 units.</div>
      </div>
    `;
  }

  content += `
      <div class="detailed-list">
        <h5 style="margin-top: 15px;">Recent Substance Use Log:</h5>
        ${recentEntries.map(entry => `
          <div class="list-item">
            <span>${new Date(entry.date).toLocaleDateString()}</span>
            <span class="highlight">
              🚬 ${entry.smoking.cigarettes} cigs | 🍺 ${entry.alcohol.beer + entry.alcohol.wine + entry.alcohol.spirits} drinks
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
}
function generateFoodSection(food) {
  if (!food || !food.meals || food.meals.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🍽️ Indian Food & Nutrition Comprehensive Analysis</div>
        <div class="no-data">No food tracking data available. Proper nutrition tracking is essential for optimal health management.</div>
        <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
          <div class="analysis-title" style="color: #1e40af;">📋 Nutrition Tracking Guidelines</div>
          <div style="color: #1e40af;">
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li><strong>Balanced Diet:</strong> Include all food groups in appropriate portions</li>
              <li><strong>Calorie Awareness:</strong> Track daily caloric intake based on your goals</li>
              <li><strong>Macronutrient Balance:</strong> 45-65% carbs, 20-35% fats, 10-35% protein</li>
              <li><strong>Micronutrients:</strong> Ensure adequate vitamins and minerals</li>
              <li><strong>Hydration:</strong> Drink 8-10 glasses of water daily</li>
              <li><strong>Meal Timing:</strong> Regular meal times support metabolism</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  const allMeals = food.meals;
  const last7Days = allMeals.filter(meal => new Date(meal.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const last30Days = allMeals.filter(meal => new Date(meal.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  // Calculate comprehensive nutritional statistics
  const totalCalories = last7Days.reduce((sum, meal) => sum + meal.totalCalories, 0);
  const avgDailyCalories = Math.round(totalCalories / Math.min(last7Days.length, 7));
  const totalProtein = last7Days.reduce((sum, meal) => sum + meal.totalProtein, 0);
  const totalCarbs = last7Days.reduce((sum, meal) => sum + meal.totalCarbs, 0);
  const totalFat = last7Days.reduce((sum, meal) => sum + meal.totalFat, 0);
  const totalFiber = last7Days.reduce((sum, meal) => sum + (meal.totalFiber || 0), 0);
  const totalSugar = last7Days.reduce((sum, meal) => sum + (meal.totalSugar || 0), 0);
  const totalSodium = last7Days.reduce((sum, meal) => sum + (meal.totalSodium || 0), 0);

  // Daily averages
  const avgProtein = Math.round(totalProtein / Math.min(last7Days.length, 7));
  const avgCarbs = Math.round(totalCarbs / Math.min(last7Days.length, 7));
  const avgFat = Math.round(totalFat / Math.min(last7Days.length, 7));
  const avgFiber = Math.round(totalFiber / Math.min(last7Days.length, 7));
  const avgSugar = Math.round(totalSugar / Math.min(last7Days.length, 7));
  const avgSodium = Math.round(totalSodium / Math.min(last7Days.length, 7));

  // Meal type distribution
  const mealTypes = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  last30Days.forEach(meal => {
    mealTypes[meal.mealType] = (mealTypes[meal.mealType] || 0) + 1;
  });

  // Indian food analysis
  const indianFoods = {};
  last30Days.forEach(meal => {
    meal.foods?.forEach(food => {
      indianFoods[food.foodName] = (indianFoods[food.foodName] || 0) + 1;
    });
  });

  // Nutritional goals and assessment
  const userProfile = food.userProfile || {};
  const calorieGoal = userProfile.dailyCalorieGoal || 2000;
  const proteinGoal = userProfile.proteinGoal || Math.round(calorieGoal * 0.15 / 4); // 15% of calories
  const carbGoal = userProfile.carbGoal || Math.round(calorieGoal * 0.55 / 4); // 55% of calories
  const fatGoal = userProfile.fatGoal || Math.round(calorieGoal * 0.30 / 9); // 30% of calories

  const nutritionalBalance = assessNutritionalBalance(avgDailyCalories, avgProtein, avgCarbs, avgFat, calorieGoal, proteinGoal, carbGoal, fatGoal);
  const dietQuality = assessDietQuality(avgSugar, avgSodium, avgFiber, indianFoods);

  let content = `
    <div class="section">
      <div class="section-title">🍽️ Indian Food & Nutrition Comprehensive Analysis</div>
      
      <!-- Nutritional Overview Dashboard -->
      <div class="analysis-box" style="background: linear-gradient(135deg, ${nutritionalBalance.color}20 0%, ${nutritionalBalance.color}10 100%); border: 2px solid ${nutritionalBalance.color}; margin-bottom: 20px;">
        <div class="analysis-title" style="color: ${nutritionalBalance.color}; font-size: 18px;">
          🎯 Nutritional Status: ${nutritionalBalance.status}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: ${nutritionalBalance.color};">${avgDailyCalories}</div>
            <div style="font-size: 12px; color: ${nutritionalBalance.color}; font-weight: 500;">Daily Calories</div>
            <div style="font-size: 10px; color: ${nutritionalBalance.color};">Goal: ${calorieGoal}</div>
          </div>
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: ${nutritionalBalance.color};">${avgProtein}g</div>
            <div style="font-size: 12px; color: ${nutritionalBalance.color}; font-weight: 500;">Protein</div>
            <div style="font-size: 10px; color: ${nutritionalBalance.color};">Goal: ${proteinGoal}g</div>
          </div>
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: ${nutritionalBalance.color};">${avgCarbs}g</div>
            <div style="font-size: 12px; color: ${nutritionalBalance.color}; font-weight: 500;">Carbohydrates</div>
            <div style="font-size: 10px; color: ${nutritionalBalance.color};">Goal: ${carbGoal}g</div>
          </div>
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: ${nutritionalBalance.color};">${avgFat}g</div>
            <div style="font-size: 12px; color: ${nutritionalBalance.color}; font-weight: 500;">Fats</div>
            <div style="font-size: 10px; color: ${nutritionalBalance.color};">Goal: ${fatGoal}g</div>
          </div>
        </div>
      </div>

      <!-- Macronutrient Distribution -->
      <div class="data-grid" style="margin-bottom: 20px;">
        <div class="data-item" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b;">
          <div class="data-label">Calorie Goal Achievement</div>
          <div class="data-value" style="color: #d97706; font-weight: bold;">
            ${Math.round((avgDailyCalories / calorieGoal) * 100)}%
          </div>
          <div style="font-size: 11px; color: #d97706; margin-top: 4px;">
            ${avgDailyCalories > calorieGoal * 1.1 ? 'Above target' : avgDailyCalories < calorieGoal * 0.9 ? 'Below target' : 'On target'}
          </div>
        </div>
        <div class="data-item" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #16a34a;">
          <div class="data-label">Diet Quality Score</div>
          <div class="data-value" style="color: #16a34a; font-weight: bold;">${dietQuality.score}/100</div>
          <div style="font-size: 11px; color: #16a34a; margin-top: 4px;">
            ${dietQuality.grade}
          </div>
        </div>
      </div>

      <!-- Detailed Nutritional Breakdown -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📊 Detailed Nutritional Analysis (7-Day Average)</h5>
        <div class="list-item">
          <span>🔥 Total Calories</span>
          <span class="highlight" style="background: ${avgDailyCalories > calorieGoal * 1.1 ? '#fef2f2' : avgDailyCalories < calorieGoal * 0.9 ? '#fef3c7' : '#f0fdf4'};">
            ${avgDailyCalories} kcal (${Math.round((avgDailyCalories/calorieGoal)*100)}% of goal)
          </span>
        </div>
        <div class="list-item">
          <span>🥩 Protein</span>
          <span class="highlight" style="background: ${avgProtein < proteinGoal * 0.8 ? '#fef3c7' : '#f0fdf4'};">
            ${avgProtein}g (${Math.round((avgProtein*4/avgDailyCalories)*100)}% of calories)
          </span>
        </div>
        <div class="list-item">
          <span>🍚 Carbohydrates</span>
          <span class="highlight" style="background: ${avgCarbs > carbGoal * 1.2 ? '#fef3c7' : '#f0fdf4'};">
            ${avgCarbs}g (${Math.round((avgCarbs*4/avgDailyCalories)*100)}% of calories)
          </span>
        </div>
        <div class="list-item">
          <span>🥑 Fats</span>
          <span class="highlight" style="background: ${avgFat > fatGoal * 1.2 ? '#fef3c7' : '#f0fdf4'};">
            ${avgFat}g (${Math.round((avgFat*9/avgDailyCalories)*100)}% of calories)
          </span>
        </div>
        <div class="list-item">
          <span>🌾 Fiber</span>
          <span class="highlight" style="background: ${avgFiber < 25 ? '#fef3c7' : '#f0fdf4'};">
            ${avgFiber}g (Recommended: 25-35g/day)
          </span>
        </div>
        <div class="list-item">
          <span>🍯 Sugar</span>
          <span class="highlight" style="background: ${avgSugar > 50 ? '#fef2f2' : avgSugar > 25 ? '#fef3c7' : '#f0fdf4'};">
            ${avgSugar}g (Recommended: <50g/day)
          </span>
        </div>
        <div class="list-item">
          <span>🧂 Sodium</span>
          <span class="highlight" style="background: ${avgSodium > 2300 ? '#fef2f2' : avgSodium > 1500 ? '#fef3c7' : '#f0fdf4'};">
            ${avgSodium}mg (Recommended: <2300mg/day)
          </span>
        </div>
      </div>

      <!-- Indian Food Preferences -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">🇮🇳 Most Consumed Indian Foods (Last 30 Days)</h5>
        ${Object.entries(indianFoods).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([food, count]) => {
          const percentage = Math.round((count / last30Days.length) * 100);
          return `
            <div class="list-item">
              <span style="font-weight: 500;">${food}</span>
              <span class="highlight" style="background: #fef3c7; color: #d97706;">
                ${count} times (${percentage}% of meals)
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Meal Pattern Analysis -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">🕐 Meal Pattern Distribution (Last 30 Days)</h5>
        ${Object.entries(mealTypes).filter(([_, count]) => count > 0).map(([type, count]) => {
          const percentage = Math.round((count / last30Days.length) * 100);
          const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
          
          return `
            <div class="list-item">
              <span>${mealEmojis[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
              <span class="highlight" style="background: #e0f2fe; color: #0369a1;">
                ${count} meals (${percentage}%)
              </span>
            </div>
          `;
        }).join('')}
      </div>
  `;

  // Nutritional concerns and alerts
  const concerns = [];
  if (avgSugar > 50) concerns.push({ type: 'High Sugar', level: 'high', message: 'Excessive sugar intake may increase diabetes and obesity risk' });
  if (avgSodium > 2300) concerns.push({ type: 'High Sodium', level: 'high', message: 'High sodium intake increases hypertension risk' });
  if (avgFiber < 20) concerns.push({ type: 'Low Fiber', level: 'moderate', message: 'Insufficient fiber may affect digestive health' });
  if (avgProtein < proteinGoal * 0.8) concerns.push({ type: 'Low Protein', level: 'moderate', message: 'Inadequate protein may affect muscle maintenance' });
  if (avgDailyCalories > calorieGoal * 1.2) concerns.push({ type: 'Excess Calories', level: 'moderate', message: 'Consistent overeating may lead to weight gain' });

  if (concerns.length > 0) {
    content += `
      <div class="analysis-box ${concerns.some(c => c.level === 'high') ? 'risk-high' : 'risk-moderate'}" style="margin-bottom: 20px;">
        <div class="analysis-title">⚠️ Nutritional Concerns & Alerts</div>
        <div style="margin-top: 10px;">
          ${concerns.map(concern => `
            <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 4px;">
              <strong style="color: ${concern.level === 'high' ? '#dc2626' : '#d97706'};">${concern.type}:</strong>
              <span style="font-size: 13px;">${concern.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Recent meals log
  content += `
    <div class="detailed-list" style="margin-bottom: 20px;">
      <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📅 Recent Indian Meals</h5>
      ${last7Days.slice(-10).map(meal => {
        const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
        const isHighCalorie = meal.totalCalories > calorieGoal * 0.4; // More than 40% of daily goal in one meal
        
        return `
          <div class="list-item" style="align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #1f2937;">
                ${mealEmojis[meal.mealType]} ${new Date(meal.date).toLocaleDateString()} - ${meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                ${meal.foods?.map(f => f.foodName).join(', ') || 'No foods listed'}
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                P: ${meal.totalProtein}g | C: ${meal.totalCarbs}g | F: ${meal.totalFat}g
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: bold; color: ${isHighCalorie ? '#ef4444' : '#16a34a'};">
                ${meal.totalCalories} kcal
              </div>
              <div style="font-size: 11px; color: ${isHighCalorie ? '#ef4444' : '#16a34a'};">
                ${Math.round((meal.totalCalories/calorieGoal)*100)}% daily
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Dietary recommendations
  content += `
    <div class="analysis-box" style="background: #f0fdf4; border-color: #16a34a; margin-bottom: 20px;">
      <div class="analysis-title" style="color: #16a34a;">🥗 Personalized Indian Diet Recommendations</div>
      <div style="color: #16a34a;">
        ${generateIndianDietRecommendations(nutritionalBalance, dietQuality, concerns, userProfile)}
      </div>
    </div>
  `;

  // Nutritional goals tracking
  content += `
    <div class="analysis-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b;">
      <div class="analysis-title" style="color: #d97706;">🎯 Nutritional Goals & Progress Tracking</div>
      <div style="color: #d97706;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Current Achievement</div>
            <div style="font-size: 13px;">
              • Calories: ${Math.round((avgDailyCalories/calorieGoal)*100)}% of goal<br>
              • Protein: ${Math.round((avgProtein/proteinGoal)*100)}% of goal<br>
              • Fiber: ${Math.round((avgFiber/30)*100)}% of recommended<br>
              • Overall Score: ${dietQuality.score}/100
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Next Week Focus</div>
            <div style="font-size: 13px;">
              ${generateNutritionalGoals(avgDailyCalories, avgProtein, avgFiber, avgSugar, avgSodium, calorieGoal, proteinGoal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content += `</div>`;
  return content;
}

function assessNutritionalBalance(calories, protein, carbs, fat, calorieGoal, proteinGoal, carbGoal, fatGoal) {
  let score = 0;
  
  // Calorie balance (0-40 points)
  const calorieRatio = calories / calorieGoal;
  if (calorieRatio >= 0.9 && calorieRatio <= 1.1) score += 40;
  else if (calorieRatio >= 0.8 && calorieRatio <= 1.2) score += 30;
  else if (calorieRatio >= 0.7 && calorieRatio <= 1.3) score += 20;
  else score += 10;
  
  // Protein adequacy (0-30 points)
  const proteinRatio = protein / proteinGoal;
  if (proteinRatio >= 0.9 && proteinRatio <= 1.2) score += 30;
  else if (proteinRatio >= 0.8 && proteinRatio <= 1.3) score += 20;
  else if (proteinRatio >= 0.7) score += 10;
  
  // Macronutrient distribution (0-30 points)
  const totalCals = (protein * 4) + (carbs * 4) + (fat * 9);
  const proteinPercent = (protein * 4) / totalCals * 100;
  const carbPercent = (carbs * 4) / totalCals * 100;
  const fatPercent = (fat * 9) / totalCals * 100;
  
  if (proteinPercent >= 15 && proteinPercent <= 25 && 
      carbPercent >= 45 && carbPercent <= 65 && 
      fatPercent >= 20 && fatPercent <= 35) {
    score += 30;
  } else if (proteinPercent >= 10 && proteinPercent <= 30 && 
             carbPercent >= 40 && carbPercent <= 70 && 
             fatPercent >= 15 && fatPercent <= 40) {
    score += 20;
  } else {
    score += 10;
  }
  
  if (score >= 80) return { status: 'Excellent Balance', color: '#16a34a' };
  if (score >= 60) return { status: 'Good Balance', color: '#f59e0b' };
  if (score >= 40) return { status: 'Fair Balance', color: '#ef4444' };
  return { status: 'Poor Balance', color: '#991b1b' };
}

function assessDietQuality(sugar, sodium, fiber, foods) {
  let score = 100;
  
  // Sugar penalty
  if (sugar > 75) score -= 30;
  else if (sugar > 50) score -= 20;
  else if (sugar > 25) score -= 10;
  
  // Sodium penalty
  if (sodium > 3000) score -= 25;
  else if (sodium > 2300) score -= 15;
  else if (sodium > 1500) score -= 5;
  
  // Fiber bonus/penalty
  if (fiber < 15) score -= 20;
  else if (fiber < 20) score -= 10;
  else if (fiber >= 30) score += 10;
  
  // Food variety bonus
  const uniqueFoods = Object.keys(foods).length;
  if (uniqueFoods >= 20) score += 15;
  else if (uniqueFoods >= 15) score += 10;
  else if (uniqueFoods >= 10) score += 5;
  else if (uniqueFoods < 5) score -= 10;
  
  score = Math.max(0, Math.min(100, score));
  
  let grade = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';
  
  return { score, grade };
}

function generateIndianDietRecommendations(balance, quality, concerns, profile) {
  const recommendations = [];
  
  // Balance-based recommendations
  if (balance.status === 'Poor Balance') {
    recommendations.push("⚖️ <strong>Improve Macronutrient Balance:</strong> Focus on balanced Indian meals with proper portions of dal (protein), rice/roti (carbs), and healthy fats from ghee/oils.");
  }
  
  // Concern-specific recommendations
  concerns.forEach(concern => {
    if (concern.type === 'High Sugar') {
      recommendations.push("🍯 <strong>Reduce Sugar Intake:</strong> Limit sweets like gulab jamun, jalebi. Choose fresh fruits over sugary desserts. Reduce sugar in chai/coffee.");
    }
    if (concern.type === 'High Sodium') {
      recommendations.push("🧂 <strong>Lower Sodium:</strong> Reduce salt in cooking, limit pickles and papad. Use herbs like coriander, mint, and spices for flavor instead.");
    }
    if (concern.type === 'Low Fiber') {
      recommendations.push("🌾 <strong>Increase Fiber:</strong> Include more whole grains (brown rice, whole wheat), vegetables (bhindi, palak), and legumes (rajma, chana).");
    }
    if (concern.type === 'Low Protein') {
      recommendations.push("🥩 <strong>Boost Protein:</strong> Include more dal, paneer, chicken, fish, eggs, and yogurt in your daily meals.");
    }
  });
  
  // Indian-specific healthy recommendations
  recommendations.push("🇮🇳 <strong>Traditional Indian Superfoods:</strong> Include turmeric (anti-inflammatory), ginger (digestive), curry leaves (antioxidants), and fenugreek seeds (blood sugar control).");
  
  recommendations.push("🥗 <strong>Balanced Indian Plate:</strong> Follow the ideal Indian plate - 1/2 vegetables (sabzi), 1/4 whole grains (roti/brown rice), 1/4 protein (dal/paneer/meat).");
  
  if (quality.score < 70) {
    recommendations.push("🌈 <strong>Increase Food Variety:</strong> Try different regional Indian cuisines - South Indian (sambar, rasam), Bengali (fish curry), Punjabi (sarson ka saag).");
  }
  
  return recommendations.map(rec => `<div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(22, 163, 74, 0.2);">${rec}</div>`).join('');
}

function generateNutritionalGoals(calories, protein, fiber, sugar, sodium, calorieGoal, proteinGoal) {
  const goals = [];
  
  if (Math.abs(calories - calorieGoal) > calorieGoal * 0.1) {
    const adjustment = calories > calorieGoal ? 'reduce' : 'increase';
    const amount = Math.abs(calories - calorieGoal);
    goals.push(`• ${adjustment.charAt(0).toUpperCase() + adjustment.slice(1)} daily calories by ${amount} kcal`);
  }
  
  if (protein < proteinGoal * 0.9) {
    goals.push(`• Increase protein by ${Math.round(proteinGoal - protein)}g daily`);
  }
  
  if (fiber < 25) {
    goals.push("• Add 5-10g more fiber through vegetables and whole grains");
  }
  
  if (sugar > 50) {
    goals.push("• Reduce sugar intake by limiting sweets and sugary drinks");
  }
  
  if (sodium > 2300) {
    goals.push("• Lower sodium by reducing salt and processed foods");
  }
  
  if (goals.length === 0) {
    goals.push("• Maintain current excellent nutritional balance!");
  }
  
  return goals.join('<br>');
}

function generateExerciseSection(exercise) {
  if (!exercise || !exercise.exercises || exercise.exercises.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🏃‍♂️ Exercise & Fitness Comprehensive Analysis</div>
        <div class="no-data">No exercise data available. Regular physical activity is essential for optimal health.</div>
        <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
          <div class="analysis-title" style="color: #1e40af;">📋 Exercise Guidelines & Recommendations</div>
          <div style="color: #1e40af;">
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li><strong>Aerobic Activity:</strong> 150 minutes moderate or 75 minutes vigorous per week</li>
              <li><strong>Strength Training:</strong> 2+ days per week targeting all major muscle groups</li>
              <li><strong>Flexibility:</strong> Daily stretching and mobility work</li>
              <li><strong>Balance:</strong> Include balance exercises, especially if over 65</li>
              <li><strong>Daily Steps:</strong> Aim for 8,000-10,000 steps per day</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  const allExercises = exercise.exercises;
  const last7Days = allExercises.filter(ex => new Date(ex.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const last30Days = allExercises.filter(ex => new Date(ex.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const last90Days = allExercises.filter(ex => new Date(ex.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

  // Calculate comprehensive statistics
  const totalCaloriesBurned = last7Days.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
  const totalDuration = last7Days.reduce((sum, ex) => sum + ex.duration, 0);
  const totalSteps = last7Days.reduce((sum, ex) => sum + (ex.steps || 0), 0);
  const exerciseDays = last7Days.length;
  const uniqueDays = new Set(last7Days.map(ex => new Date(ex.date).toDateString())).size;

  // Weekly and monthly averages
  const weeklyAvgCalories = Math.round(totalCaloriesBurned);
  const weeklyAvgDuration = Math.round(totalDuration);
  const monthlyCalories = last30Days.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
  const monthlyDuration = last30Days.reduce((sum, ex) => sum + ex.duration, 0);

  // Exercise type analysis
  const exerciseTypes = {};
  const intensityDistribution = { low: 0, moderate: 0, high: 0, very_high: 0 };
  
  last30Days.forEach(ex => {
    exerciseTypes[ex.exerciseType] = (exerciseTypes[ex.exerciseType] || 0) + 1;
    intensityDistribution[ex.intensity] = (intensityDistribution[ex.intensity] || 0) + 1;
  });

  // Fitness goals assessment
  const weeklyGoalMinutes = 150; // WHO recommendation
  const weeklyGoalCalories = 1000; // Approximate for weight management
  const goalAchievement = {
    duration: Math.min(100, Math.round((totalDuration / weeklyGoalMinutes) * 100)),
    calories: Math.min(100, Math.round((totalCaloriesBurned / weeklyGoalCalories) * 100)),
    frequency: Math.min(100, Math.round((uniqueDays / 5) * 100)) // 5 days per week goal
  };

  // Fitness level assessment
  const fitnessLevel = assessFitnessLevel(exerciseDays, totalDuration, totalCaloriesBurned, intensityDistribution);
  const consistency = calculateExerciseConsistency(allExercises);

  let content = `
    <div class="section">
      <div class="section-title">🏃‍♂️ Exercise & Fitness Comprehensive Analysis</div>
      
      <!-- Fitness Overview Dashboard -->
      <div class="analysis-box" style="background: linear-gradient(135deg, ${fitnessLevel.color}20 0%, ${fitnessLevel.color}10 100%); border: 2px solid ${fitnessLevel.color}; margin-bottom: 20px;">
        <div class="analysis-title" style="color: ${fitnessLevel.color}; font-size: 18px;">
          🎯 Current Fitness Level: ${fitnessLevel.level}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: bold; color: ${fitnessLevel.color};">${uniqueDays}</div>
            <div style="font-size: 12px; color: ${fitnessLevel.color}; font-weight: 500;">Active Days (7d)</div>
            <div style="font-size: 10px; color: ${fitnessLevel.color};">Goal: 5+ days</div>
          </div>
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: bold; color: ${fitnessLevel.color};">${Math.round(totalDuration/60)}h</div>
            <div style="font-size: 12px; color: ${fitnessLevel.color}; font-weight: 500;">Total Time (7d)</div>
            <div style="font-size: 10px; color: ${fitnessLevel.color};">Goal: 2.5+ hours</div>
          </div>
          <div style="text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: bold; color: ${fitnessLevel.color};">${totalCaloriesBurned}</div>
            <div style="font-size: 12px; color: ${fitnessLevel.color}; font-weight: 500;">Calories (7d)</div>
            <div style="font-size: 10px; color: ${fitnessLevel.color};">Goal: 1000+ kcal</div>
          </div>
        </div>
      </div>

      <!-- Goal Achievement Progress -->
      <div class="data-grid" style="margin-bottom: 20px;">
        <div class="data-item" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #16a34a;">
          <div class="data-label">Weekly Duration Goal</div>
          <div class="data-value" style="color: #16a34a; font-weight: bold;">${goalAchievement.duration}%</div>
          <div style="font-size: 11px; color: #16a34a; margin-top: 4px;">
            ${totalDuration}/${weeklyGoalMinutes} minutes
          </div>
        </div>
        <div class="data-item" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b;">
          <div class="data-label">Calorie Burn Goal</div>
          <div class="data-value" style="color: #d97706; font-weight: bold;">${goalAchievement.calories}%</div>
          <div style="font-size: 11px; color: #d97706; margin-top: 4px;">
            ${totalCaloriesBurned}/${weeklyGoalCalories} kcal
          </div>
        </div>
      </div>

      <!-- Exercise Statistics -->
      <div class="data-grid" style="margin-bottom: 20px;">
        <div class="data-item">
          <div class="data-label">Total Exercise Sessions</div>
          <div class="data-value">${allExercises.length}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            Last 30 days: ${last30Days.length} | Last 90 days: ${last90Days.length}
          </div>
        </div>
        <div class="data-item">
          <div class="data-label">Exercise Consistency</div>
          <div class="data-value">${consistency.score}%</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
            ${consistency.description}
          </div>
        </div>
      </div>

      <!-- Exercise Type Distribution -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">🏋️ Exercise Type Analysis (Last 30 Days)</h5>
        ${Object.entries(exerciseTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
          const percentage = Math.round((count / last30Days.length) * 100);
          const typeCalories = last30Days.filter(ex => ex.exerciseType === type).reduce((sum, ex) => sum + ex.caloriesBurned, 0);
          const typeDuration = last30Days.filter(ex => ex.exerciseType === type).reduce((sum, ex) => sum + ex.duration, 0);
          
          return `
            <div class="list-item" style="align-items: flex-start;">
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #1f2937;">${type}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                  ${count} sessions • ${typeDuration} min • ${typeCalories} kcal
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 16px; font-weight: bold; color: #2563eb;">${percentage}%</div>
                <div style="font-size: 11px; color: #6b7280;">of workouts</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Intensity Distribution -->
      <div class="detailed-list" style="margin-bottom: 20px;">
        <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">⚡ Exercise Intensity Distribution (Last 30 Days)</h5>
        ${Object.entries(intensityDistribution).filter(([_, count]) => count > 0).map(([intensity, count]) => {
          const percentage = Math.round((count / last30Days.length) * 100);
          const intensityColors = {
            low: '#16a34a',
            moderate: '#f59e0b', 
            high: '#ef4444',
            very_high: '#991b1b'
          };
          
          return `
            <div class="list-item">
              <span style="color: ${intensityColors[intensity]}; font-weight: 500;">
                ${intensity.replace('_', ' ').toUpperCase()} Intensity
              </span>
              <span class="highlight" style="background: ${intensityColors[intensity]}20; color: ${intensityColors[intensity]};">
                ${count} sessions (${percentage}%)
              </span>
            </div>
          `;
        }).join('')}
      </div>
  `;

  // Monthly comparison and trends
  if (last90Days.length > 30) {
    const previousMonth = last90Days.filter(ex => {
      const date = new Date(ex.date);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });
    
    const prevMonthCalories = previousMonth.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
    const prevMonthDuration = previousMonth.reduce((sum, ex) => sum + ex.duration, 0);
    
    const calorieChange = monthlyCalories - prevMonthCalories;
    const durationChange = monthlyDuration - prevMonthDuration;
    
    content += `
      <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6; margin-bottom: 20px;">
        <div class="analysis-title" style="color: #1e40af;">📈 Monthly Progress Comparison</div>
        <div style="color: #1e40af; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Calorie Burn Trend</div>
            <div style="font-size: 13px;">
              This month: ${monthlyCalories} kcal<br>
              Last month: ${prevMonthCalories} kcal<br>
              Change: <span style="color: ${calorieChange >= 0 ? '#16a34a' : '#ef4444'}; font-weight: bold;">
                ${calorieChange >= 0 ? '+' : ''}${calorieChange} kcal (${Math.round((calorieChange/prevMonthCalories)*100)}%)
              </span>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Exercise Duration Trend</div>
            <div style="font-size: 13px;">
              This month: ${Math.round(monthlyDuration/60)} hours<br>
              Last month: ${Math.round(prevMonthDuration/60)} hours<br>
              Change: <span style="color: ${durationChange >= 0 ? '#16a34a' : '#ef4444'}; font-weight: bold;">
                ${durationChange >= 0 ? '+' : ''}${Math.round(durationChange/60)} hours (${Math.round((durationChange/prevMonthDuration)*100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Recent exercise sessions
  content += `
    <div class="detailed-list" style="margin-bottom: 20px;">
      <h5 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">📅 Recent Exercise Sessions</h5>
      ${last7Days.slice(-10).map(ex => {
        const intensityColors = {
          low: '#16a34a',
          moderate: '#f59e0b', 
          high: '#ef4444',
          very_high: '#991b1b'
        };
        
        return `
          <div class="list-item" style="align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #1f2937;">
                ${new Date(ex.date).toLocaleDateString()} - ${ex.exerciseType}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                ${ex.intensity} intensity • ${ex.duration} min${ex.steps ? ` • ${ex.steps} steps` : ''}
                ${ex.notes ? ` • ${ex.notes}` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: bold; color: ${intensityColors[ex.intensity]};">
                ${ex.caloriesBurned} kcal
              </div>
              <div style="font-size: 11px; color: ${intensityColors[ex.intensity]};">
                ${ex.intensity.toUpperCase()}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Health benefits and recommendations
  content += `
    <div class="analysis-box" style="background: #f0fdf4; border-color: #16a34a; margin-bottom: 20px;">
      <div class="analysis-title" style="color: #16a34a;">🎯 Health Benefits & Personalized Recommendations</div>
      <div style="color: #16a34a;">
        ${generateExerciseHealthBenefits(totalCaloriesBurned, totalDuration, uniqueDays, fitnessLevel)}
      </div>
    </div>
  `;

  // Fitness goals and targets
  content += `
    <div class="analysis-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b;">
      <div class="analysis-title" style="color: #d97706;">🏆 Fitness Goals & Achievement Tracking</div>
      <div style="color: #d97706;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Weekly Targets</div>
            <div style="font-size: 13px;">
              • Duration: ${goalAchievement.duration >= 100 ? '✅' : '⚠️'} ${totalDuration}/150 min<br>
              • Frequency: ${goalAchievement.frequency >= 100 ? '✅' : '⚠️'} ${uniqueDays}/5 days<br>
              • Calories: ${goalAchievement.calories >= 100 ? '✅' : '⚠️'} ${totalCaloriesBurned}/1000 kcal<br>
              • Overall: ${Math.round((goalAchievement.duration + goalAchievement.frequency + goalAchievement.calories)/3)}% achieved
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Next Week Goals</div>
            <div style="font-size: 13px;">
              ${generateNextWeekGoals(goalAchievement, fitnessLevel, exerciseTypes)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  content += `</div>`;
  return content;
}

function assessFitnessLevel(exerciseDays, totalDuration, totalCalories, intensityDist) {
  let score = 0;
  
  // Frequency score (0-40 points)
  if (exerciseDays >= 5) score += 40;
  else if (exerciseDays >= 3) score += 30;
  else if (exerciseDays >= 1) score += 15;
  
  // Duration score (0-30 points)
  if (totalDuration >= 150) score += 30;
  else if (totalDuration >= 100) score += 20;
  else if (totalDuration >= 50) score += 10;
  
  // Intensity score (0-30 points)
  const highIntensity = intensityDist.high + intensityDist.very_high;
  const total = Object.values(intensityDist).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    const highIntensityRatio = highIntensity / total;
    if (highIntensityRatio >= 0.3) score += 30;
    else if (highIntensityRatio >= 0.1) score += 20;
    else score += 10;
  }
  
  if (score >= 80) return { level: 'Elite Athlete', color: '#991b1b' };
  if (score >= 60) return { level: 'Highly Active', color: '#dc2626' };
  if (score >= 40) return { level: 'Moderately Active', color: '#f59e0b' };
  if (score >= 20) return { level: 'Lightly Active', color: '#16a34a' };
  return { level: 'Sedentary', color: '#6b7280' };
}

function calculateExerciseConsistency(exercises) {
  if (exercises.length < 7) return { score: 0, description: 'Insufficient data' };
  
  const last30Days = exercises.filter(ex => new Date(ex.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const exerciseDates = last30Days.map(ex => new Date(ex.date).toDateString());
  const uniqueDays = new Set(exerciseDates).size;
  
  const consistency = Math.round((uniqueDays / 30) * 100);
  
  let description = 'Poor consistency';
  if (consistency >= 80) description = 'Excellent consistency';
  else if (consistency >= 60) description = 'Good consistency';
  else if (consistency >= 40) description = 'Fair consistency';
  
  return { score: consistency, description };
}

function generateExerciseHealthBenefits(calories, duration, days, fitnessLevel) {
  const benefits = [];
  
  // Cardiovascular benefits
  if (duration >= 150) {
    benefits.push("❤️ <strong>Cardiovascular Excellence:</strong> Your " + duration + " minutes of weekly exercise significantly reduces heart disease risk and improves cardiovascular health.");
  } else if (duration >= 75) {
    benefits.push("❤️ <strong>Heart Health Benefits:</strong> Good exercise duration contributing to cardiovascular fitness. Consider increasing to 150+ minutes for optimal benefits.");
  }
  
  // Weight management
  if (calories >= 1000) {
    benefits.push("⚖️ <strong>Weight Management:</strong> Burning " + calories + " calories weekly supports healthy weight maintenance and metabolic health.");
  } else if (calories >= 500) {
    benefits.push("⚖️ <strong>Calorie Burn:</strong> Your " + calories + " weekly calorie burn contributes to weight management. Increase intensity for greater benefits.");
  }
  
  // Mental health
  if (days >= 5) {
    benefits.push("🧠 <strong>Mental Health Boost:</strong> Exercising " + days + " days per week significantly improves mood, reduces stress, and enhances cognitive function.");
  } else if (days >= 3) {
    benefits.push("🧠 <strong>Mood Enhancement:</strong> Regular exercise routine positively impacts mental health and stress management.");
  }
  
  // Fitness level specific benefits
  if (fitnessLevel.level === 'Elite Athlete') {
    benefits.push("🏆 <strong>Peak Performance:</strong> Your elite fitness level provides maximum health benefits including superior cardiovascular health, optimal body composition, and enhanced longevity.");
  } else if (fitnessLevel.level === 'Highly Active') {
    benefits.push("💪 <strong>High Fitness Benefits:</strong> Your active lifestyle provides excellent health benefits and positions you in the top fitness percentile.");
  }
  
  // Recommendations
  if (duration < 150) {
    benefits.push("🎯 <strong>Improvement Opportunity:</strong> Increase weekly exercise to 150+ minutes for optimal health benefits as recommended by WHO.");
  }
  
  if (days < 3) {
    benefits.push("📅 <strong>Frequency Recommendation:</strong> Aim for at least 3-5 exercise days per week for consistent health benefits.");
  }
  
  return benefits.map(benefit => `<div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid rgba(22, 163, 74, 0.2);">${benefit}</div>`).join('');
}

function generateNextWeekGoals(achievement, fitnessLevel, exerciseTypes) {
  const goals = [];
  
  if (achievement.duration < 100) {
    const needed = Math.ceil((150 - (achievement.duration * 150 / 100)) / 7);
    goals.push(`• Add ${needed} min/day to reach 150 min/week`);
  }
  
  if (achievement.frequency < 100) {
    goals.push("• Exercise on 5+ days");
  }
  
  if (achievement.calories < 100) {
    goals.push("• Increase intensity or duration");
  }
  
  // Variety recommendations
  const typeCount = Object.keys(exerciseTypes).length;
  if (typeCount < 3) {
    goals.push("• Try 2+ new exercise types");
  }
  
  // Fitness level specific goals
  if (fitnessLevel.level === 'Sedentary') {
    goals.push("• Start with 15-20 min daily walks");
  } else if (fitnessLevel.level === 'Lightly Active') {
    goals.push("• Add 1 strength training session");
  } else if (fitnessLevel.level === 'Moderately Active') {
    goals.push("• Include 1 high-intensity workout");
  }
  
  return goals.join('<br>') || '• Maintain current excellent routine!';
}
function generateCognitiveSection(cognitive) {
  if (!cognitive || !cognitive.assessments || cognitive.assessments.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🧠 Cognitive Assessment</div>
        <div class="no-data">No cognitive assessment data available</div>
      </div>
    `;
  }

  const recentAssessments = cognitive.assessments.slice(-5);
  const latestAssessment = recentAssessments[recentAssessments.length - 1];
  const avgOverallScore = Math.round(recentAssessments.reduce((sum, a) => sum + a.overallScore, 0) / recentAssessments.length);

  let content = `
    <div class="section">
      <div class="section-title">🧠 Cognitive Assessment</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Assessments</div>
          <div class="data-value">${cognitive.assessments.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Latest Overall Score</div>
          <div class="data-value">${latestAssessment.overallScore}/15</div>
        </div>
      </div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Average Score (Recent 5)</div>
          <div class="data-value">${avgOverallScore}/15</div>
        </div>
        <div class="data-item">
          <div class="data-label">Last Assessment Date</div>
          <div class="data-value">${new Date(latestAssessment.date).toLocaleDateString()}</div>
        </div>
      </div>
  `;

  // Cognitive performance analysis
  if (avgOverallScore >= 13) {
    content += `
      <div class="analysis-box risk-low">
        <div class="analysis-title">✅ Excellent Cognitive Performance</div>
        <div>Your average cognitive score is ${avgOverallScore}/15, indicating excellent cognitive function across memory and visual perception tasks.</div>
      </div>
    `;
  } else if (avgOverallScore >= 10) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">👍 Good Cognitive Performance</div>
        <div>Your average cognitive score is ${avgOverallScore}/15, showing good cognitive function. Continue regular mental exercises to maintain performance.</div>
      </div>
    `;
  } else {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Cognitive Performance Needs Attention</div>
        <div>Your average cognitive score is ${avgOverallScore}/15. Consider regular brain training exercises and consult a healthcare professional if concerned.</div>
      </div>
    `;
  }

  // Latest assessment breakdown
  if (latestAssessment.insights) {
    content += `
      <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
        <div class="analysis-title" style="color: #1e40af;">🔍 Latest Assessment Insights</div>
        <div style="color: #1e40af;">
          <div class="data-grid" style="margin-top: 10px;">
            <div class="data-item" style="background: white;">
              <div class="data-label">Cognitive Status</div>
              <div class="data-value">${latestAssessment.insights.cognitiveStatus || 'N/A'}</div>
            </div>
            <div class="data-item" style="background: white;">
              <div class="data-label">Memory Function</div>
              <div class="data-value">${latestAssessment.insights.memoryFunction || 'N/A'}</div>
            </div>
          </div>
          <div class="data-grid">
            <div class="data-item" style="background: white;">
              <div class="data-label">Eye Health</div>
              <div class="data-value">${latestAssessment.insights.eyeHealth || 'N/A'}</div>
            </div>
            <div class="data-item" style="background: white;">
              <div class="data-label">Overall Score</div>
              <div class="data-value">${latestAssessment.overallScore}/15</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Test performance breakdown
  if (latestAssessment.eyeTest && latestAssessment.brainTest) {
    content += `
      <div style="margin-top: 15px;">
        <h5>Latest Test Performance:</h5>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Eye Test Score</div>
            <div class="data-value">${latestAssessment.eyeTest.score}/5</div>
          </div>
          <div class="data-item">
            <div class="data-label">Brain Test Score</div>
            <div class="data-value">${latestAssessment.brainTest.score}/10</div>
          </div>
        </div>
      </div>
    `;
  }

  // Assessment history
  content += `
    <div class="detailed-list">
      <h5 style="margin-top: 15px;">Recent Assessment History:</h5>
      ${recentAssessments.map(assessment => `
        <div class="list-item">
          <div>
            <strong>${new Date(assessment.date).toLocaleDateString()}</strong><br>
            <small>Eye: ${assessment.eyeTest?.score || 0}/5 | Brain: ${assessment.brainTest?.score || 0}/10</small>
          </div>
          <span class="highlight" style="background: ${assessment.overallScore >= 13 ? '#f0fdf4' : assessment.overallScore >= 10 ? '#fef3c7' : '#fef2f2'};">
            ${assessment.overallScore}/15
          </span>
        </div>
      `).join('')}
    </div>
  `;

  // Cognitive health recommendations
  content += `
    <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
      <div class="analysis-title" style="color: #1e40af;">🎯 Cognitive Health Recommendations</div>
      <div style="color: #1e40af;">
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li>Regular cognitive assessments help track mental acuity over time</li>
          <li>Brain training exercises can improve memory and processing speed</li>
          <li>Regular eye exams are important for visual perception health</li>
          <li>Physical exercise also benefits cognitive function</li>
          <li>Adequate sleep and nutrition support brain health</li>
          ${avgOverallScore < 10 ? '<li>Consider consulting a healthcare professional for comprehensive cognitive evaluation</li>' : ''}
        </ul>
      </div>
    </div>
  `;

  content += `</div>`;
  return content;
}

// Compact section generators for print-friendly PDF version
function generateCompactSummarySection(data) {
  const trackers = [
    { name: 'Child Vaccination', data: data.vaccines, key: 'children' },
    { name: 'Period & PCOS', data: data.period, key: 'pcosAssessments' },
    { name: 'Blood Pressure', data: data.bloodPressure, key: 'readings' },
    { name: 'Diabetes', data: data.diabetes, key: 'readings' },
    { name: 'Sleep', data: data.sleep, key: 'entries' },
    { name: 'Mood', data: data.mood, key: 'entries' },
    { name: 'Overall Health', data: data.overall, key: 'entries' },
    { name: 'Medicine', data: data.medicine, key: 'medicines' },
    { name: 'Substance Use', data: data.substance, key: 'entries' },
    { name: 'Indian Food Analyzer', data: data.food, key: 'meals' },
    { name: 'Exercise Tracker', data: data.exercise, key: 'exercises' },
    { name: 'Cognitive Assessment', data: data.cognitive, key: 'assessments' }
  ];

  const activeTrackers = trackers.filter(tracker => {
    if (!tracker.data) return false;
    const dataArray = tracker.data[tracker.key];
    return dataArray && dataArray.length > 0;
  });

  const totalDataPoints = activeTrackers.reduce((sum, tracker) => {
    const dataArray = tracker.data[tracker.key];
    return sum + (dataArray ? dataArray.length : 0);
  }, 0);

  return `
    <div class="section">
      <div class="section-title">📊 Health Tracking Summary</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Active Trackers</div>
          <div class="data-value">${activeTrackers.length}/${trackers.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Total Data Points</div>
          <div class="data-value">${totalDataPoints}</div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${activeTrackers.map(tracker => 
            `<span class="highlight">${tracker.name}</span>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateCompactVaccineSection(vaccines) {
  if (!vaccines || !vaccines.children || vaccines.children.length === 0) {
    return `<div class="section"><div class="section-title">👶 Child Vaccination</div><div class="no-data">No data</div></div>`;
  }

  let content = `<div class="section"><div class="section-title">👶 Child Vaccination</div>`;
  
  vaccines.children.forEach(child => {
    const completed = child.vaccines?.filter(v => v.isCompleted).length || 0;
    const total = child.vaccines?.length || 0;
    const overdue = child.vaccines?.filter(v => !v.isCompleted && new Date(v.dueDate) < new Date()).length || 0;
    
    content += `
      <div class="data-item" style="margin-bottom: 10px;">
        <div class="data-label">${child.babyName}</div>
        <div class="data-value">${completed}/${total} completed${overdue > 0 ? `, ${overdue} overdue` : ''}</div>
      </div>
    `;
  });
  
  return content + `</div>`;
}

function generateCompactPeriodSection(period) {
  if (!period || !period.pcosAssessments || period.pcosAssessments.length === 0) {
    return `<div class="section"><div class="section-title">🌸 Period & PCOS</div><div class="no-data">No data</div></div>`;
  }

  const latest = period.pcosAssessments[period.pcosAssessments.length - 1];
  const riskClass = latest.riskLevel === 'High' ? 'risk-high' : 
                   latest.riskLevel === 'Moderate' ? 'risk-moderate' : 'risk-low';

  return `
    <div class="section">
      <div class="section-title">🌸 Period & PCOS</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Risk Level</div>
          <div class="data-value">${latest.riskLevel}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Score</div>
          <div class="data-value">${latest.totalScore}/23</div>
        </div>
      </div>
      <div class="analysis-box ${riskClass}">
        <div class="analysis-title">Latest Assessment</div>
        <div>BMI: ${latest.bmi || 'N/A'} | Cycle: ${latest.cycleLength || 'N/A'} days</div>
      </div>
    </div>
  `;
}

function generateCompactBPSection(bp) {
  if (!bp || !bp.readings || bp.readings.length === 0) {
    return `<div class="section"><div class="section-title">❤️ Blood Pressure</div><div class="no-data">No data</div></div>`;
  }

  const recent = bp.readings.slice(-5);
  const avgSys = Math.round(recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length);
  const avgDia = Math.round(recent.reduce((sum, r) => sum + r.diastolic, 0) / recent.length);
  const highCount = recent.filter(r => r.systolic > 140 || r.diastolic > 90).length;

  return `
    <div class="section">
      <div class="section-title">❤️ Blood Pressure</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Average BP</div>
          <div class="data-value">${avgSys}/${avgDia} mmHg</div>
        </div>
        <div class="data-item">
          <div class="data-label">High Readings</div>
          <div class="data-value">${highCount}/${recent.length}</div>
        </div>
      </div>
      ${highCount > 0 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>${highCount} elevated readings detected</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactDiabetesSection(diabetes) {
  if (!diabetes || !diabetes.readings || diabetes.readings.length === 0) {
    return `<div class="section"><div class="section-title">🩺 Diabetes</div><div class="no-data">No data</div></div>`;
  }

  const recent = diabetes.readings.slice(-5);
  const avgGlucose = Math.round(recent.reduce((sum, r) => sum + r.glucoseLevel, 0) / recent.length);
  const highCount = recent.filter(r => r.glucoseLevel > 180).length;
  const lowCount = recent.filter(r => r.glucoseLevel < 70).length;

  return `
    <div class="section">
      <div class="section-title">🩺 Diabetes</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Average Glucose</div>
          <div class="data-value">${avgGlucose} mg/dL</div>
        </div>
        <div class="data-item">
          <div class="data-label">Abnormal Readings</div>
          <div class="data-value">${highCount + lowCount}/${recent.length}</div>
        </div>
      </div>
      ${(highCount > 0 || lowCount > 0) ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>${highCount} high, ${lowCount} low readings</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactSleepSection(sleep) {
  if (!sleep || !sleep.entries || sleep.entries.length === 0) {
    return `<div class="section"><div class="section-title">😴 Sleep</div><div class="no-data">No data</div></div>`;
  }

  const recent = sleep.entries.slice(-7);
  const avgSleep = (recent.reduce((sum, e) => sum + e.sleepDuration, 0) / recent.length).toFixed(1);
  const poorDays = recent.filter(e => e.sleepQuality === 'poor' || e.sleepQuality === 'fair').length;

  return `
    <div class="section">
      <div class="section-title">😴 Sleep</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Average Sleep</div>
          <div class="data-value">${avgSleep} hours</div>
        </div>
        <div class="data-item">
          <div class="data-label">Poor Sleep Days</div>
          <div class="data-value">${poorDays}/7</div>
        </div>
      </div>
      ${avgSleep < 6 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>Insufficient sleep duration</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactMoodSection(mood) {
  if (!mood || !mood.entries || mood.entries.length === 0) {
    return `<div class="section"><div class="section-title">😊 Mood</div><div class="no-data">No data</div></div>`;
  }

  const recent = mood.entries.slice(-7);
  const lowMoodDays = recent.filter(e => e.overallMood === 'sad' || e.overallMood === 'very_sad').length;
  const highStressDays = recent.filter(e => e.stressLevel === 'high' || e.stressLevel === 'very_high').length;

  return `
    <div class="section">
      <div class="section-title">😊 Mood</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Low Mood Days</div>
          <div class="data-value">${lowMoodDays}/7</div>
        </div>
        <div class="data-item">
          <div class="data-label">High Stress Days</div>
          <div class="data-value">${highStressDays}/7</div>
        </div>
      </div>
      ${(lowMoodDays > 3 || highStressDays > 4) ? `
        <div class="analysis-box risk-moderate">
          <div class="analysis-title">Alert</div>
          <div>Mood/stress concerns detected</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactOverallSection(overall) {
  if (!overall || !overall.entries || overall.entries.length === 0) {
    return `<div class="section"><div class="section-title">🏥 Overall Health</div><div class="no-data">No data</div></div>`;
  }

  const recent = overall.entries.slice(-5);
  const lastEntry = recent[recent.length - 1];

  return `
    <div class="section">
      <div class="section-title">🏥 Overall Health</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Entries</div>
          <div class="data-value">${overall.entries.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Last Wellbeing</div>
          <div class="data-value">${lastEntry.overallWellbeing?.replace('_', ' ') || 'N/A'}</div>
        </div>
      </div>
    </div>
  `;
}

function generateCompactMedicineSection(medicine) {
  if (!medicine || !medicine.medicines || medicine.medicines.length === 0) {
    return `<div class="section"><div class="section-title">💊 Medicine</div><div class="no-data">No data</div></div>`;
  }

  const active = medicine.medicines.filter(med => med.isActive);
  const recentLog = medicine.medicineLog?.slice(-10) || [];
  const adherence = recentLog.length > 0 ? Math.round((recentLog.filter(log => log.status === 'taken').length / recentLog.length) * 100) : 0;

  return `
    <div class="section">
      <div class="section-title">💊 Medicine</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Active Medications</div>
          <div class="data-value">${active.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Adherence Rate</div>
          <div class="data-value">${adherence}%</div>
        </div>
      </div>
      ${adherence < 80 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>Low medication adherence</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactSubstanceSection(substance) {
  if (!substance || !substance.entries || substance.entries.length === 0) {
    return `<div class="section"><div class="section-title">🚭 Substance Use</div><div class="no-data">No data</div></div>`;
  }

  const recent = substance.entries.slice(-7);
  const smokingDays = recent.filter(e => e.smoking.cigarettes > 0 || e.smoking.cigars > 0).length;
  const drinkingDays = recent.filter(e => e.alcohol.beer > 0 || e.alcohol.wine > 0 || e.alcohol.spirits > 0).length;

  return `
    <div class="section">
      <div class="section-title">🚭 Substance Use</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Smoking Days</div>
          <div class="data-value">${smokingDays}/7</div>
        </div>
        <div class="data-item">
          <div class="data-label">Drinking Days</div>
          <div class="data-value">${drinkingDays}/7</div>
        </div>
      </div>
      ${smokingDays > 0 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>Smoking activity detected</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactFoodSection(food) {
  if (!food || !food.meals || food.meals.length === 0) {
    return `<div class="section"><div class="section-title">🍽️ Indian Food</div><div class="no-data">No data</div></div>`;
  }

  const recent = food.meals.slice(-7);
  const avgCalories = Math.round(recent.reduce((sum, meal) => sum + meal.totalCalories, 0) / Math.min(recent.length, 7));
  const calorieGoal = food.userProfile?.dailyCalorieGoal || 2000;
  const caloriePercentage = Math.round((avgCalories / calorieGoal) * 100);

  return `
    <div class="section">
      <div class="section-title">🍽️ Indian Food</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Daily Calories</div>
          <div class="data-value">${avgCalories} kcal</div>
        </div>
        <div class="data-item">
          <div class="data-label">Goal Achievement</div>
          <div class="data-value">${caloriePercentage}%</div>
        </div>
      </div>
      ${(caloriePercentage > 120 || caloriePercentage < 80) ? `
        <div class="analysis-box risk-moderate">
          <div class="analysis-title">Alert</div>
          <div>${caloriePercentage > 120 ? 'High' : 'Low'} calorie intake</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactExerciseSection(exercise) {
  if (!exercise || !exercise.exercises || exercise.exercises.length === 0) {
    return `<div class="section"><div class="section-title">🏃‍♂️ Exercise</div><div class="no-data">No data</div></div>`;
  }

  const recent = exercise.exercises.slice(-7);
  const totalCalories = recent.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
  const exerciseDays = recent.length;

  return `
    <div class="section">
      <div class="section-title">🏃‍♂️ Exercise</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Exercise Days</div>
          <div class="data-value">${exerciseDays}/7</div>
        </div>
        <div class="data-item">
          <div class="data-label">Calories Burned</div>
          <div class="data-value">${totalCalories} kcal</div>
        </div>
      </div>
      ${exerciseDays >= 5 ? `
        <div class="analysis-box risk-low">
          <div class="analysis-title">Excellent</div>
          <div>Great exercise consistency</div>
        </div>
      ` : exerciseDays < 3 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>Low exercise activity</div>
        </div>
      ` : ''}
    </div>
  `;
}

function generateCompactCognitiveSection(cognitive) {
  if (!cognitive || !cognitive.assessments || cognitive.assessments.length === 0) {
    return `<div class="section"><div class="section-title">🧠 Cognitive</div><div class="no-data">No data</div></div>`;
  }

  const recent = cognitive.assessments.slice(-5);
  const latest = recent[recent.length - 1];
  const avgScore = Math.round(recent.reduce((sum, a) => sum + a.overallScore, 0) / recent.length);

  return `
    <div class="section">
      <div class="section-title">🧠 Cognitive</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Latest Score</div>
          <div class="data-value">${latest.overallScore}/15</div>
        </div>
        <div class="data-item">
          <div class="data-label">Average Score</div>
          <div class="data-value">${avgScore}/15</div>
        </div>
      </div>
      ${avgScore >= 13 ? `
        <div class="analysis-box risk-low">
          <div class="analysis-title">Excellent</div>
          <div>Great cognitive performance</div>
        </div>
      ` : avgScore < 10 ? `
        <div class="analysis-box risk-high">
          <div class="analysis-title">Alert</div>
          <div>Cognitive performance needs attention</div>
        </div>
      ` : ''}
    </div>
  `;
}

module.exports = router;
