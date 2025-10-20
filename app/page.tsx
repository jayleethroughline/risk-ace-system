'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [text, setText] = useState('');
  const [trueCategory, setTrueCategory] = useState('');
  const [trueRisk, setTrueRisk] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);

  const categories = [
    'suicidal_ideation',
    'self_harm',
    'abuse',
    'violence',
    'harassment',
    'none',
  ];

  const riskLevels = ['critical', 'high', 'medium', 'low', 'none'];

  const handleClassify = async () => {
    if (!text.trim()) {
      alert('Please enter text to classify');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          true_category: trueCategory || undefined,
          true_risk: trueRisk || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error classifying:', error);
      alert('Failed to classify text');
    } finally {
      setLoading(false);
    }
  };

  const runFullCycle = async () => {
    if (!text.trim() || !trueCategory || !trueRisk) {
      alert('Please fill in all fields for a full cycle');
      return;
    }

    setRunningCycle(true);
    try {
      // Step 1: Generate classification
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          true_category: trueCategory,
          true_risk: trueRisk,
        }),
      });
      const generateData = await generateResponse.json();
      setResult(generateData);

      // Step 2: Reflect on errors
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Step 3: Curate playbook
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      alert('Full ACE cycle completed! Check Playbook and Metrics pages.');
    } catch (error) {
      console.error('Error running cycle:', error);
      alert('Failed to complete cycle');
    } finally {
      setRunningCycle(false);
    }
  };

  const isCorrect = result &&
    trueCategory &&
    trueRisk &&
    result.category === trueCategory &&
    result.risk_level === trueRisk;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Risk-ACE Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Agentic Context Engine for Risk Classification
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Classify Text</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter text to classify..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                True Category (optional)
              </label>
              <select
                value={trueCategory}
                onChange={(e) => setTrueCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                True Risk Level (optional)
              </label>
              <select
                value={trueRisk}
                onChange={(e) => setTrueRisk(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Risk Level --</option>
                {riskLevels.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleClassify}
              disabled={loading || runningCycle}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Classifying...' : 'Classify'}
            </button>

            <button
              onClick={runFullCycle}
              disabled={loading || runningCycle}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {runningCycle ? 'Running Cycle...' : 'Run Full ACE Cycle'}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Classification Result</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Category:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {result.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Risk Level:</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {result.risk_level}
                </span>
              </div>

              {trueCategory && trueRisk && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Accuracy:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          How the ACE System Works
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>
            <strong>Generator</strong> classifies text using current playbook heuristics
          </li>
          <li>
            <strong>Reflector</strong> analyzes errors and creates insights
          </li>
          <li>
            <strong>Curator</strong> updates the playbook based on reflections
          </li>
          <li>System continuously improves through context evolution</li>
        </ol>
      </div>
    </div>
  );
}
