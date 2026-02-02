import { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { toast } from 'react-toastify';

const CognitiveAssessment = () => {
  const [currentTest, setCurrentTest] = useState('intro'); // intro, eye, brain, results
  const [eyeTestData, setEyeTestData] = useState({
    currentQuestion: 0,
    results: [],
    startTime: null
  });
  const [brainTestData, setBrainTestData] = useState({
    currentQuestion: 0,
    results: [],
    startTime: null,
    showNumbers: false,
    displayTime: 3000 // 3 seconds
  });
  const [userInput, setUserInput] = useState('');
  const [brainInput, setBrainInput] = useState(['', '', '', '', '']);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);

  const colors = [
    { name: 'red', hex: '#EF4444', display: 'Red' },
    { name: 'blue', hex: '#3B82F6', display: 'Blue' },
    { name: 'green', hex: '#10B981', display: 'Green' },
    { name: 'yellow', hex: '#F59E0B', display: 'Yellow' },
    { name: 'purple', hex: '#8B5CF6', display: 'Purple' },
    { name: 'orange', hex: '#F97316', display: 'Orange' },
    { name: 'pink', hex: '#EC4899', display: 'Pink' },
    { name: 'brown', hex: '#92400E', display: 'Brown' }
  ];

  const [eyeTestSequence, setEyeTestSequence] = useState([]);
  const [brainTestSequence, setBrainTestSequence] = useState([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Generate random sequences when component mounts
    generateEyeTestSequence();
    generateBrainTestSequence();
  }, []);

  const generateEyeTestSequence = () => {
    const sequence = [];
    for (let i = 0; i < 5; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      sequence.push(randomColor);
    }
    setEyeTestSequence(sequence);
  };

  const generateBrainTestSequence = () => {
    const sequence = [];
    for (let i = 0; i < 3; i++) {
      const numbers = [];
      for (let j = 0; j < 5; j++) {
        numbers.push(Math.floor(Math.random() * 9) + 1);
      }
      sequence.push(numbers);
    }
    setBrainTestSequence(sequence);
  };

  const startEyeTest = () => {
    setCurrentTest('eye');
    setEyeTestData({
      currentQuestion: 0,
      results: [],
      startTime: Date.now()
    });
  };

  const handleEyeTestAnswer = () => {
    if (!userInput.trim()) {
      toast.error('Please enter a color name');
      return;
    }

    const currentColor = eyeTestSequence[eyeTestData.currentQuestion];
    const responseTime = Date.now() - eyeTestData.startTime;
    const isCorrect = userInput.toLowerCase().trim() === currentColor.name.toLowerCase();

    const newResult = {
      colorShown: currentColor.name,
      userAnswer: userInput.toLowerCase().trim(),
      isCorrect,
      responseTime
    };

    const newResults = [...eyeTestData.results, newResult];
    
    if (eyeTestData.currentQuestion < 4) {
      setEyeTestData({
        currentQuestion: eyeTestData.currentQuestion + 1,
        results: newResults,
        startTime: Date.now()
      });
      setUserInput('');
    } else {
      // Eye test completed
      setEyeTestData(prev => ({ ...prev, results: newResults }));
      setUserInput('');
      startBrainTest();
    }
  };

  const startBrainTest = () => {
    setCurrentTest('brain');
    setBrainTestData({
      currentQuestion: 0,
      results: [],
      startTime: Date.now(),
      showNumbers: true
    });
    setBrainInput(['', '', '', '', '']); // Clear inputs when starting

    // Hide numbers after display time
    timeoutRef.current = setTimeout(() => {
      setBrainTestData(prev => ({ ...prev, showNumbers: false, startTime: Date.now() })); // Reset start time when hiding numbers
    }, 3000); // Use fixed 3 seconds
  };

  const handleBrainTestAnswer = () => {
    // Check if all inputs have valid numbers
    if (brainInput.some(input => !input.trim() || isNaN(parseInt(input.trim())))) {
      toast.error('Please fill in all number fields with valid numbers (1-9)');
      return;
    }

    const currentNumbers = brainTestSequence[brainTestData.currentQuestion];
    const userNumbers = brainInput.map(input => parseInt(input.trim()));
    const responseTime = Date.now() - brainTestData.startTime;
    
    let correctCount = 0;
    for (let i = 0; i < 5; i++) {
      if (currentNumbers[i] === userNumbers[i]) {
        correctCount++;
      }
    }

    const newResult = {
      numbersShown: currentNumbers,
      userAnswer: userNumbers,
      correctCount,
      responseTime
    };

    const newResults = [...brainTestData.results, newResult];
    
    if (brainTestData.currentQuestion < 2) {
      setBrainTestData({
        currentQuestion: brainTestData.currentQuestion + 1,
        results: newResults,
        startTime: Date.now(),
        showNumbers: true
      });
      setBrainInput(['', '', '', '', '']); // Clear inputs immediately
      
      // Hide numbers after display time
      timeoutRef.current = setTimeout(() => {
        setBrainTestData(prev => ({ ...prev, showNumbers: false, startTime: Date.now() })); // Reset start time for input phase
      }, 3000); // Use fixed 3 seconds instead of brainTestData.displayTime
    } else {
      // Brain test completed
      setBrainTestData(prev => ({ ...prev, results: newResults }));
      setBrainInput(['', '', '', '', '']);
      submitAssessment(eyeTestData.results, newResults);
    }
  };

  const submitAssessment = async (eyeResults, brainResults) => {
    setLoading(true);
    try {
      // Calculate eye test metrics
      const eyeCorrect = eyeResults.filter(r => r.isCorrect).length;
      const eyeAvgTime = eyeResults.reduce((sum, r) => sum + r.responseTime, 0) / eyeResults.length;
      const eyeScore = Math.round((eyeCorrect / 5) * 100);

      // Calculate brain test metrics
      const brainCorrect = brainResults.reduce((sum, r) => sum + r.correctCount, 0);
      const brainAvgTime = brainResults.reduce((sum, r) => sum + r.responseTime, 0) / brainResults.length;
      const brainScore = Math.round((brainCorrect / 15) * 100); // 15 total numbers across 3 tests

      const assessmentData = {
        eyeTest: {
          results: eyeResults,
          totalCorrect: eyeCorrect,
          averageResponseTime: eyeAvgTime,
          score: eyeScore
        },
        brainTest: {
          results: brainResults,
          totalCorrect: brainCorrect,
          averageResponseTime: brainAvgTime,
          score: brainScore
        }
      };

      const response = await axios.post('/health-trackers/cognitive-assessment', assessmentData);
      setAssessment(response.data);
      setCurrentTest('results');
      toast.success('Cognitive assessment completed!');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  const resetAssessment = () => {
    setCurrentTest('intro');
    setEyeTestData({ currentQuestion: 0, results: [], startTime: null });
    setBrainTestData({ currentQuestion: 0, results: [], startTime: null, showNumbers: false });
    setUserInput('');
    setBrainInput(['', '', '', '', '']);
    setAssessment(null);
    generateEyeTestSequence();
    generateBrainTestSequence();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Cognitive Assessment</h1>
        <p className="text-gray-600">Test your visual perception and memory function</p>
      </div>

      {currentTest === 'intro' && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-6">🧠</div>
          <h2 className="text-2xl font-bold mb-4">Welcome to Cognitive Assessment</h2>
          <div className="text-left max-w-2xl mx-auto mb-8">
            <h3 className="text-lg font-semibold mb-3">This assessment includes two tests:</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">👁️</span>
                <div>
                  <h4 className="font-medium">Eye Test (Color Recognition)</h4>
                  <p className="text-gray-600 text-sm">5 colors will be shown one by one. Type the correct color name for each.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🧮</span>
                <div>
                  <h4 className="font-medium">Brain Test (Memory Recall)</h4>
                  <p className="text-gray-600 text-sm">5 random numbers will be displayed for 3 seconds. Remember and input them in the same order.</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={startEyeTest}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Start Assessment
          </button>
        </div>
      )}

      {currentTest === 'eye' && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Eye Test - Color Recognition</h2>
            <p className="text-gray-600">Question {eyeTestData.currentQuestion + 1} of 5</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((eyeTestData.currentQuestion + 1) / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {eyeTestSequence[eyeTestData.currentQuestion] && (
            <div className="mb-8">
              <p className="text-lg mb-6">What color do you see?</p>
              <div 
                className="w-32 h-32 mx-auto rounded-lg shadow-lg mb-6"
                style={{ backgroundColor: eyeTestSequence[eyeTestData.currentQuestion].hex }}
              ></div>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEyeTestAnswer()}
                placeholder="Type the color name"
                className="w-64 p-3 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <div className="mt-4">
                <button
                  onClick={handleEyeTestAnswer}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Submit Answer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentTest === 'brain' && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Brain Test - Memory Recall</h2>
            <p className="text-gray-600">Test {brainTestData.currentQuestion + 1} of 3</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((brainTestData.currentQuestion + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {brainTestData.showNumbers ? (
            <div className="mb-8">
              <p className="text-lg mb-6">Memorize these numbers (3 seconds)</p>
              <div className="flex justify-center space-x-4 mb-6">
                {brainTestSequence[brainTestData.currentQuestion]?.map((number, index) => (
                  <div 
                    key={index}
                    className="w-16 h-16 bg-purple-100 border-2 border-purple-300 rounded-lg flex items-center justify-center text-2xl font-bold text-purple-800"
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-lg mb-6">Enter the numbers in the same order</p>
              <div className="flex justify-center space-x-2 mb-6">
                {brainInput.map((value, index) => (
                  <input
                    key={index}
                    type="number"
                    min="1"
                    max="9"
                    value={value}
                    onChange={(e) => {
                      const newInput = [...brainInput];
                      newInput[index] = e.target.value;
                      setBrainInput(newInput);
                    }}
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg text-center text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength="1"
                  />
                ))}
              </div>
              <button
                onClick={handleBrainTestAnswer}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      )}

      {currentTest === 'results' && assessment && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4">Assessment Complete!</h2>
            <div className="text-3xl font-bold mb-2">
              <span className={getScoreColor(assessment.overallScore)}>
                Overall Score: {assessment.overallScore}%
              </span>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-lg border p-6 ${getScoreBg(assessment.eyeTest.score)}`}>
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">👁️</span>
                <div>
                  <h3 className="text-lg font-bold">Eye Test Results</h3>
                  <p className="text-sm text-gray-600">Color Recognition</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={`font-bold ${getScoreColor(assessment.eyeTest.score)}`}>
                    {assessment.eyeTest.score}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Correct:</span>
                  <span>{assessment.eyeTest.totalCorrect}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span>{(assessment.eyeTest.averageResponseTime / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            <div className={`rounded-lg border p-6 ${getScoreBg(assessment.brainTest.score)}`}>
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">🧮</span>
                <div>
                  <h3 className="text-lg font-bold">Brain Test Results</h3>
                  <p className="text-sm text-gray-600">Memory Recall</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={`font-bold ${getScoreColor(assessment.brainTest.score)}`}>
                    {assessment.brainTest.score}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Correct:</span>
                  <span>{assessment.brainTest.totalCorrect}/15</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span>{(assessment.brainTest.averageResponseTime / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Assessment Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">👁️ Eye Health Analysis</h4>
                <p className="text-sm text-gray-700 mb-3">{assessment.insights.eyeHealth}</p>
                
                <h4 className="font-semibold text-purple-800 mb-2">🧠 Memory Function Analysis</h4>
                <p className="text-sm text-gray-700">{assessment.insights.memoryFunction}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-green-800 mb-2">🎯 Cognitive Status</h4>
                <p className="text-sm text-gray-700 mb-3">{assessment.insights.cognitiveStatus}</p>
                
                {assessment.insights.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-2">💡 Recommendations</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {assessment.insights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={resetAssessment}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Take Assessment Again
            </button>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-yellow-800">Medical Disclaimer</h4>
            <p className="text-yellow-700 text-sm mt-1">
              This cognitive assessment is for informational purposes only and should not be used as a substitute for professional medical diagnosis. 
              If you have concerns about your cognitive health, vision, or memory, please consult with a qualified healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitiveAssessment;