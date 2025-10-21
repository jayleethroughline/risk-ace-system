'use client';

import { useState } from 'react';

export default function DatabasePage() {
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleResetDatabase = async () => {
    if (confirmText !== 'RESET') {
      setMessage({ type: 'error', text: 'Please type RESET to confirm' });
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/database/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Database reset successfully! Training will start from Run #1.' });
        setConfirmText('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset database' });
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      setMessage({ type: 'error', text: 'An error occurred while resetting the database' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your training database</p>
      </div>

      {/* Reset Database Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-gray-900">Reset Database</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  This will delete all training data from the database, including:
                </p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>All training runs and their results</li>
                  <li>All epoch history and metrics</li>
                  <li>All agent logs (Generator, Reflector, Curator)</li>
                  <li>All training data samples</li>
                  <li>All reflections</li>
                </ul>
                <p className="mt-3 font-semibold text-gray-900">
                  ✅ The playbook table will be preserved
                </p>
                <p className="mt-2 text-gray-700">
                  After reset, the next training run will start with Run ID #1.
                </p>
              </div>

              <div className="mt-6">
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-bold text-red-600">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="Type RESET"
                  disabled={isResetting}
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleResetDatabase}
                  disabled={isResetting || confirmText !== 'RESET'}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isResetting || confirmText !== 'RESET'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                >
                  {isResetting ? 'Resetting...' : 'Reset Database'}
                </button>
              </div>

              {message && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Use Case</h3>
            <div className="mt-2 text-sm text-blue-800">
              <p>
                Use this reset function when you want to start fresh with new training data while
                keeping your baseline playbook intact. This is useful when:
              </p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Testing different training datasets</li>
                <li>Starting a new experiment with clean metrics</li>
                <li>Clearing out test runs before production training</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
