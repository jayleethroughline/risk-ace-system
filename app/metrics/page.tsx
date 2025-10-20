'use client';

import { useState, useEffect } from 'react';

interface MetricsData {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  total: number;
}

export default function MetricsPage() {
  const [overallMetrics, setOverallMetrics] = useState<any>(null);
  const [categoryMetrics, setCategoryMetrics] = useState<Record<string, MetricsData> | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<Record<string, MetricsData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overall' | 'category' | 'risk'>('overall');

  useEffect(() => {
    fetchMetrics();
  }, [selectedView]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      if (selectedView === 'overall') {
        const response = await fetch('/api/evaluate?type=overall');
        const data = await response.json();
        setOverallMetrics(data);
      } else if (selectedView === 'category') {
        const response = await fetch('/api/evaluate?type=category');
        const data = await response.json();
        setCategoryMetrics(data.category_metrics);
      } else if (selectedView === 'risk') {
        const response = await fetch('/api/evaluate?type=risk');
        const data = await response.json();
        setRiskMetrics(data.risk_metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (label: string, value: number, subtitle?: string) => (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-gray-900">
        {(value * 100).toFixed(1)}%
      </div>
      {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
    </div>
  );

  const renderDetailedMetrics = (metrics: Record<string, MetricsData>, title: string) => (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {title.includes('Category') ? 'Category' : 'Risk Level'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precision
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recall
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F1 Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(metrics).map(([key, metric]) => (
              <tr key={key}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                  {key.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {(metric.precision * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {(metric.recall * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                  {(metric.f1 * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {(metric.accuracy * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {metric.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Metrics</h1>
        <p className="mt-2 text-gray-600">
          F1 scores and accuracy for category and risk classification
        </p>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setSelectedView('overall')}
          className={`px-4 py-2 font-medium text-sm ${
            selectedView === 'overall'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => setSelectedView('category')}
          className={`px-4 py-2 font-medium text-sm ${
            selectedView === 'category'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          By Category
        </button>
        <button
          onClick={() => setSelectedView('risk')}
          className={`px-4 py-2 font-medium text-sm ${
            selectedView === 'risk'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          By Risk Level
        </button>
      </div>

      {selectedView === 'overall' && overallMetrics && (
        <>
          {overallMetrics.overall ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderMetricCard(
                  'Overall Accuracy',
                  overallMetrics.overall.accuracy,
                  `${overallMetrics.overall.correct} / ${overallMetrics.overall.total} correct`
                )}
                {renderMetricCard(
                  'Correct Predictions',
                  overallMetrics.overall.correct / overallMetrics.overall.total,
                  `${overallMetrics.overall.correct} predictions`
                )}
                {renderMetricCard(
                  'Total Evaluations',
                  1,
                  `${overallMetrics.overall.total} samples`
                )}
              </div>
              {overallMetrics.overall.avg_latency_ms !== null && (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Average API Latency
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">
                    {overallMetrics.overall.avg_latency_ms}ms
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Average time for LLM API response
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">
                No evaluation data available yet. Run classifications with true labels.
              </p>
            </div>
          )}
        </>
      )}

      {selectedView === 'category' && categoryMetrics && (
        <>
          {Object.keys(categoryMetrics).length > 0 ? (
            renderDetailedMetrics(categoryMetrics, 'Category-Level Metrics')
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">
                No category metrics available yet.
              </p>
            </div>
          )}
        </>
      )}

      {selectedView === 'risk' && riskMetrics && (
        <>
          {Object.keys(riskMetrics).length > 0 ? (
            renderDetailedMetrics(riskMetrics, 'Risk-Level Metrics')
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">
                No risk metrics available yet.
              </p>
            </div>
          )}
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Understanding the Metrics
        </h3>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>
            <strong>Precision:</strong> Of all items predicted as a class, what % were correct
          </li>
          <li>
            <strong>Recall:</strong> Of all items truly in a class, what % were found
          </li>
          <li>
            <strong>F1 Score:</strong> Harmonic mean of precision and recall (balanced metric)
          </li>
          <li>
            <strong>Accuracy:</strong> Overall % of correct predictions
          </li>
        </ul>
      </div>
    </div>
  );
}
