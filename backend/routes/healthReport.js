const express = require('express');
const puppeteer = require('puppeteer');
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

// Debug route to test PDF generation with simple content
router.get('/debug-pdf', auth, async (req, res) => {
  let browser;
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const simpleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF Debug Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
          .content { padding: 20px; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PDF Generation Debug Test</h1>
          <p>User: ${user.name}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
          <h2>PDF Test Content</h2>
          <p>This is a simple PDF generation test to verify that Puppeteer is working correctly.</p>
          <p>If you can see this content in a PDF file, then the PDF generation system is working properly.</p>
          <ul>
            <li>✅ Puppeteer is installed</li>
            <li>✅ Browser can be launched</li>
            <li>✅ HTML content can be rendered</li>
            <li>✅ PDF can be generated</li>
          </ul>
        </div>
      </body>
      </html>
    `;
    
    console.log('Starting debug PDF generation...');
    
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
      ],
      timeout: 30000
    });
    
    const page = await browser.newPage();
    await page.setContent(simpleHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    
    console.log('Debug PDF generated, size:', pdfBuffer.length);
    
    // Validate PDF
    const pdfHeader = pdfBuffer.slice(0, 4);
    const isValidPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46;
    
    if (!isValidPDF) {
      throw new Error('Generated PDF is invalid');
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader('Content-Disposition', `attachment; filename="debug-test-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.end(pdfBuffer, 'binary');
    
  } catch (error) {
    console.error('Debug PDF generation error:', error);
    res.status(500).json({ message: 'Debug PDF generation failed', error: error.message });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing debug browser:', closeError);
      }
    }
  }
});
// Generate comprehensive health report PDF
router.get('/download', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user information
    const user = await User.findById(userId).select('name email phone');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all health tracker data including missing ones
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

    // Process the data including new trackers
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

    // Check if user has any health data (updated to include new trackers)
    const hasData = Object.values(healthData).some(data => {
      if (!data || data === healthData.user) return false;
      if (data.children && data.children.length > 0) return true;
      if (data.readings && data.readings.length > 0) return true;
      if (data.entries && data.entries.length > 0) return true;
      if (data.medicines && data.medicines.length > 0) return true;
      if (data.pcosAssessments && data.pcosAssessments.length > 0) return true;
      if (data.meals && data.meals.length > 0) return true;
      if (data.exercises && data.exercises.length > 0) return true;
      if (data.assessments && data.assessments.length > 0) return true;
      return false;
    });

    if (!hasData) {
      return res.status(404).json({ 
        message: 'No health data found. Please use the health trackers to record your data first.' 
      });
    }

    // Generate HTML content for PDF
    const htmlContent = generateHealthReportHTML(healthData);

    // Try to generate PDF using Puppeteer
    let browser;
    try {
      console.log('Starting PDF generation...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 30000
      });
      
      console.log('Browser launched successfully');
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1200, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      console.log('Setting page content...');
      
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      
      console.log('Generating PDF...');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: true,
        timeout: 30000
      });
      
      console.log('PDF generated successfully, size:', pdfBuffer.length);
      
      // Verify PDF was generated and is valid
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Empty PDF generated');
      }
      
      // Validate PDF header
      const pdfHeader = pdfBuffer.slice(0, 4);
      const isValidPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isValidPDF) {
        console.error('Invalid PDF header detected');
        throw new Error('Generated PDF is corrupted');
      }
      
      console.log('PDF validation successful');
      
      // Set headers for PDF download with proper encoding
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Content-Disposition', `attachment; filename="health-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Send PDF as binary data
      res.end(pdfBuffer, 'binary');
      
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      
      // Fallback: return HTML with PDF generation notice
      const fallbackHtml = `
        <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; margin: 20px;">
          <h3 style="color: #856404; margin-top: 0;">PDF Generation Temporarily Unavailable</h3>
          <p style="color: #856404;">
            PDF generation is currently experiencing issues. Your health report is displayed below in HTML format.
            You can print this page using your browser's print function (Ctrl+P) to save as PDF.
          </p>
          <p style="color: #856404; font-size: 14px;">
            <strong>To save as PDF:</strong> Use your browser's Print function → Select "Save as PDF" as destination
          </p>
        </div>
        ${htmlContent}
        <script>
          // Auto-focus for better printing experience
          window.onload = function() {
            document.title = 'Health Report - ${user.name} - ${new Date().toISOString().split('T')[0]}';
          };
        </script>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="health-report-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(fallbackHtml);
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('Browser closed successfully');
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
function generateHealthReportHTML(data) {
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

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprehensive Health Report - ${data.user.name}</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
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
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                padding: 30px 20px 20px 20px;
                margin: -20px -20px 30px -20px;
                border-radius: 0;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
            }
            .subtitle {
                color: #64748b;
                font-size: 16px;
                margin-bottom: 20px;
                font-weight: 500;
            }
            .report-title {
                font-size: 28px;
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
                margin-bottom: 30px;
                page-break-inside: avoid;
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
                font-size: 14px;
            }
            .data-value {
                color: #6b7280;
                font-size: 14px;
                margin-top: 4px;
            }
            .analysis-box {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
            }
            .analysis-title {
                font-weight: bold;
                color: #92400e;
                margin-bottom: 8px;
            }
            .risk-high { background: #fef2f2; border-color: #ef4444; }
            .risk-moderate { background: #fef3c7; border-color: #f59e0b; }
            .risk-low { background: #f0fdf4; border-color: #22c55e; }
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
            }
            .list-item:last-child {
                border-bottom: none;
            }
            .highlight {
                background: #dbeafe;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 500;
            }
            @media print {
                body { margin: 0; padding: 15px; }
                .section { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">DrXConsult.in</div>
            <div class="subtitle">Comprehensive Healthcare Platform</div>
            <div class="report-title">Detailed Personal Health Report</div>
            <div style="color: #6b7280; font-size: 14px;">Generated on ${currentDate}</div>
        </div>

        <div class="patient-info">
            <h3 style="margin-top: 0; color: #1f2937;">Patient Information</h3>
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
                    <span style="font-size: 18px; margin-right: 8px;">ℹ️</span>
                    <strong style="color: #1e40af;">Data Source Declaration</strong>
                </div>
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    All health data in this report has been <strong>self-reported by the patient</strong> through the DrXConsult.in digital health tracking platform. 
                    This information represents the patient's personal health monitoring and should be reviewed by qualified healthcare professionals.
                </p>
            </div>
        </div>

        ${generateSummarySection(data)}
        ${generateVaccineSection(data.vaccines)}
        ${generatePeriodSection(data.period)}
        ${generateBPSection(data.bloodPressure)}
        ${generateDiabetesSection(data.diabetes)}
        ${generateSleepSection(data.sleep)}
        ${generateMoodSection(data.mood)}
        ${generateOverallSection(data.overall)}
        ${generateMedicineSection(data.medicine)}
        ${generateSubstanceSection(data.substance)}
        ${generateFoodSection(data.food)}
        ${generateExerciseSection(data.exercise)}
        ${generateCognitiveSection(data.cognitive)}

        <div class="disclaimer">
            <div class="disclaimer-title">⚠️ Medical Disclaimer</div>
            <p>This report contains self-reported health data provided by the patient through DrXConsult.in platform. This information is for reference purposes only and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical decisions.</p>
            <p><strong>Data Source:</strong> Patient self-reporting through digital health tracking tools</p>
        </div>

        <div class="footer">
            <p>Generated by DrXConsult.in Health Tracking Platform</p>
            <p>For medical consultations, visit www.drxconsult.in</p>
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

  return `
    <div class="section">
      <div class="section-title">📊 Comprehensive Health Tracking Summary</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Active Health Trackers</div>
          <div class="data-value">${activeTrackers.length} out of ${trackers.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Total Data Points</div>
          <div class="data-value">${totalDataPoints} entries</div>
        </div>
      </div>
      <div style="margin-top: 15px;">
        <h4>Active Tracking Areas:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
          ${activeTrackers.map(tracker => 
            `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">${tracker.name}</span>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
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
        <div class="section-title">❤️ Blood Pressure Tracker</div>
        <div class="no-data">No blood pressure data available</div>
      </div>
    `;
  }

  const recentReadings = bp.readings.slice(-10);
  const avgSystolic = Math.round(recentReadings.reduce((sum, r) => sum + r.systolic, 0) / recentReadings.length);
  const avgDiastolic = Math.round(recentReadings.reduce((sum, r) => sum + r.diastolic, 0) / recentReadings.length);
  const highBPCount = recentReadings.filter(r => r.systolic > 140 || r.diastolic > 90).length;

  let content = `
    <div class="section">
      <div class="section-title">❤️ Blood Pressure Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Readings</div>
          <div class="data-value">${bp.readings.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Average BP (Recent 10)</div>
          <div class="data-value">${avgSystolic}/${avgDiastolic} mmHg</div>
        </div>
      </div>
  `;

  if (highBPCount > 0) {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ High Blood Pressure Alert</div>
        <div>${highBPCount} out of ${recentReadings.length} recent readings show elevated blood pressure (>140/90 mmHg). Please consult your doctor.</div>
      </div>
    `;
  }

  // Add lifestyle risk assessment if available
  if (bp.lifestyleAssessment) {
    const assessment = bp.lifestyleAssessment;
    content += `
      <div class="analysis-box ${assessment.riskLevel === 'High' ? 'risk-high' : assessment.riskLevel === 'Moderate' ? 'risk-moderate' : 'risk-low'}">
        <div class="analysis-title">🎯 Lifestyle Risk Assessment</div>
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
            <span>${new Date(reading.date).toLocaleDateString()}</span>
            <span class="highlight" style="background: ${reading.systolic > 140 || reading.diastolic > 90 ? '#fef2f2' : '#f0fdf4'};">
              ${reading.systolic}/${reading.diastolic} mmHg
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return content;
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
        <div class="section-title">🍽️ Indian Food Analyzer</div>
        <div class="no-data">No food tracking data available</div>
      </div>
    `;
  }

  const recentMeals = food.meals.slice(-7);
  const totalCalories = recentMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
  const avgDailyCalories = Math.round(totalCalories / Math.min(recentMeals.length, 7));
  const avgProtein = Math.round(recentMeals.reduce((sum, meal) => sum + meal.totalProtein, 0) / recentMeals.length);
  const avgCarbs = Math.round(recentMeals.reduce((sum, meal) => sum + meal.totalCarbs, 0) / recentMeals.length);
  const avgFat = Math.round(recentMeals.reduce((sum, meal) => sum + meal.totalFat, 0) / recentMeals.length);

  let content = `
    <div class="section">
      <div class="section-title">🍽️ Indian Food Analyzer</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Meals Logged</div>
          <div class="data-value">${food.meals.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Average Daily Calories</div>
          <div class="data-value">${avgDailyCalories} kcal</div>
        </div>
      </div>
  `;

  if (food.userProfile) {
    const calorieGoal = food.userProfile.dailyCalorieGoal;
    const caloriePercentage = Math.round((avgDailyCalories / calorieGoal) * 100);

    if (caloriePercentage > 120) {
      content += `
        <div class="analysis-box risk-moderate">
          <div class="analysis-title">⚠️ High Calorie Intake</div>
          <div>Average daily calories: ${avgDailyCalories} (${caloriePercentage}% of goal). Consider portion control and balanced meals.</div>
        </div>
      `;
    } else if (caloriePercentage < 80) {
      content += `
        <div class="analysis-box risk-moderate">
          <div class="analysis-title">⚠️ Low Calorie Intake</div>
          <div>Average daily calories: ${avgDailyCalories} (${caloriePercentage}% of goal). Ensure adequate nutrition for your health needs.</div>
        </div>
      `;
    } else {
      content += `
        <div class="analysis-box risk-low">
          <div class="analysis-title">✅ Good Calorie Balance</div>
          <div>Maintaining healthy calorie intake: ${avgDailyCalories} calories/day (${caloriePercentage}% of goal).</div>
        </div>
      `;
    }
  }

  // Nutritional breakdown
  content += `
    <div class="data-grid" style="margin-top: 15px;">
      <div class="data-item">
        <div class="data-label">Average Daily Protein</div>
        <div class="data-value">${avgProtein}g</div>
      </div>
      <div class="data-item">
        <div class="data-label">Average Daily Carbs</div>
        <div class="data-value">${avgCarbs}g</div>
      </div>
    </div>
    <div class="data-grid">
      <div class="data-item">
        <div class="data-label">Average Daily Fat</div>
        <div class="data-value">${avgFat}g</div>
      </div>
      <div class="data-item">
        <div class="data-label">Dietary Restrictions</div>
        <div class="data-value">${food.userProfile?.dietaryRestrictions?.join(', ') || 'None'}</div>
      </div>
    </div>
  `;

  // Check for nutritional concerns
  const avgSugar = recentMeals.reduce((sum, meal) => sum + meal.totalSugar, 0) / recentMeals.length;
  const avgSodium = recentMeals.reduce((sum, meal) => sum + meal.totalSodium, 0) / recentMeals.length;

  if (avgSugar > 50) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">🍯 High Sugar Intake</div>
        <div>Average sugar: ${Math.round(avgSugar)}g/day (recommended: <50g). Consider reducing sugary foods and drinks.</div>
      </div>
    `;
  }

  if (avgSodium > 2300) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">🧂 High Sodium Intake</div>
        <div>Average sodium: ${Math.round(avgSodium)}mg/day (recommended: <2300mg). Reduce salt and processed foods.</div>
      </div>
    `;
  }

  // Recent meals log
  content += `
    <div class="detailed-list">
      <h5 style="margin-top: 15px;">Recent Indian Meals:</h5>
      ${recentMeals.map(meal => `
        <div class="list-item">
          <div>
            <strong>${new Date(meal.date).toLocaleDateString()}</strong><br>
            <small>${meal.mealType}: ${meal.foods?.map(f => f.foodName).join(', ') || 'N/A'}</small>
          </div>
          <span class="highlight">
            ${meal.totalCalories} kcal
          </span>
        </div>
      `).join('')}
    </div>
  </div>
  `;

  return content;
}

function generateExerciseSection(exercise) {
  if (!exercise || !exercise.exercises || exercise.exercises.length === 0) {
    return `
      <div class="section">
        <div class="section-title">🏃‍♂️ Exercise Tracker</div>
        <div class="no-data">No exercise data available</div>
      </div>
    `;
  }

  const recentExercises = exercise.exercises.slice(-7);
  const totalCaloriesBurned = recentExercises.reduce((sum, ex) => sum + ex.caloriesBurned, 0);
  const totalDuration = recentExercises.reduce((sum, ex) => sum + ex.duration, 0);
  const avgDailyCalories = Math.round(totalCaloriesBurned / Math.min(recentExercises.length, 7));
  const exerciseDays = recentExercises.length;

  let content = `
    <div class="section">
      <div class="section-title">🏃‍♂️ Exercise Tracker</div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Exercise Sessions</div>
          <div class="data-value">${exercise.exercises.length}</div>
        </div>
        <div class="data-item">
          <div class="data-label">Exercise Days (Last 7)</div>
          <div class="data-value">${exerciseDays} days</div>
        </div>
      </div>
      <div class="data-grid">
        <div class="data-item">
          <div class="data-label">Total Calories Burned (7 days)</div>
          <div class="data-value">${totalCaloriesBurned} kcal</div>
        </div>
        <div class="data-item">
          <div class="data-label">Total Exercise Time (7 days)</div>
          <div class="data-value">${totalDuration} minutes</div>
        </div>
      </div>
  `;

  // Exercise frequency analysis
  if (exerciseDays >= 5) {
    content += `
      <div class="analysis-box risk-low">
        <div class="analysis-title">✅ Excellent Exercise Consistency</div>
        <div>You exercised ${exerciseDays} days in the past week, burning ${totalCaloriesBurned} calories. Great job maintaining an active lifestyle!</div>
      </div>
    `;
  } else if (exerciseDays >= 3) {
    content += `
      <div class="analysis-box risk-moderate">
        <div class="analysis-title">👍 Good Exercise Routine</div>
        <div>You exercised ${exerciseDays} days in the past week. Try to aim for 5+ days per week for optimal health benefits.</div>
      </div>
    `;
  } else {
    content += `
      <div class="analysis-box risk-high">
        <div class="analysis-title">⚠️ Low Exercise Activity</div>
        <div>Only ${exerciseDays} exercise days in the past week. Aim for at least 150 minutes of moderate exercise per week for better health.</div>
      </div>
    `;
  }

  // Exercise type breakdown
  const exerciseTypes = {};
  recentExercises.forEach(ex => {
    exerciseTypes[ex.exerciseType] = (exerciseTypes[ex.exerciseType] || 0) + 1;
  });

  if (Object.keys(exerciseTypes).length > 0) {
    content += `
      <div style="margin-top: 15px;">
        <h5>Exercise Types (Last 7 days):</h5>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
          ${Object.entries(exerciseTypes).map(([type, count]) => 
            `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">${type} (${count}x)</span>`
          ).join('')}
        </div>
      </div>
    `;
  }

  // Recent exercises log
  content += `
    <div class="detailed-list">
      <h5 style="margin-top: 15px;">Recent Exercise Sessions:</h5>
      ${recentExercises.map(ex => `
        <div class="list-item">
          <div>
            <strong>${new Date(ex.date).toLocaleDateString()}</strong><br>
            <small>${ex.exerciseType} - ${ex.intensity} intensity - ${ex.duration} min</small>
          </div>
          <span class="highlight">
            ${ex.caloriesBurned} kcal burned
          </span>
        </div>
      `).join('')}
    </div>
  `;

  // Health benefits section
  if (totalCaloriesBurned > 0) {
    content += `
      <div class="analysis-box" style="background: #f0f9ff; border-color: #3b82f6;">
        <div class="analysis-title" style="color: #1e40af;">🎯 Health Benefits Achieved</div>
        <div style="color: #1e40af;">
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Improved cardiovascular health through ${totalDuration} minutes of exercise</li>
            <li>Enhanced metabolism by burning ${totalCaloriesBurned} calories</li>
            <li>Better muscle strength and endurance</li>
            <li>Improved mental health and stress reduction</li>
            ${exerciseDays >= 5 ? '<li>Excellent consistency supporting long-term health goals</li>' : ''}
          </ul>
        </div>
      </div>
    `;
  }

  content += `</div>`;
  return content;
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

module.exports = router;