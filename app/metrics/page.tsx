'use client';

import { useState, useEffect } from 'react';

interface EpochData {
  epoch_number: number;
  overall_f1: number;
  category_f1: number;
  risk_f1: number;
  accuracy: number;
  playbook_size: number;
  errors_found: number;
  heuristics_added: number;
}

interface TrainingRunSummary {
  run_id: number;
  name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  best_epoch: {
    epoch_number: number;
    overall_f1: number;
    category_f1: number;
    risk_f1: number;
    accuracy: number;
  } | null;
  epochs: EpochData[];
  dataset: {
    training_samples: number;
    eval_samples: number;
  };
}

export default function MetricsPage() {
  const [runs, setRuns] = useState<TrainingRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllRuns();
  }, []);

  const fetchAllRuns = async () => {
    setLoading(true);
    try {
      // Get all runs from the debug endpoint
      const debugResponse = await fetch('/api/debug/data-count');
      const debugData = await debugResponse.json();

      // Fetch status for each run
      const runDetails = await Promise.all(
        debugData.runs.map(async (run: any) => {
          const statusResponse = await fetch(`/api/training/status?run_id=${run.run_id}`);
          return statusResponse.json();
        })
      );

      setRuns(runDetails);

      // Auto-select the latest completed or running run
      const latestRun = runDetails
        .filter((r: any) => r.status === 'completed' || r.status === 'running')
        .sort((a: any, b: any) => b.run_id - a.run_id)[0];

      if (latestRun) {
        setSelectedRunId(latestRun.run_id);
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRun = runs.find(r => r.run_id === selectedRunId);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading training runs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Training Runs & Metrics</h1>
        <p className="mt-2 text-gray-600">
          View performance metrics and epoch history for all training runs
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            No training runs found. Start a training run from the Train page.
          </p>
        </div>
      ) : (
        <>
          {/* Runs List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">All Training Runs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Run ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dataset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Best F1
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Best Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Epochs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runs.map((run) => (
                    <tr
                      key={run.run_id}
                      onClick={() => setSelectedRunId(run.run_id)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedRunId === run.run_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{run.run_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.dataset.training_samples} train / {run.dataset.eval_samples} eval
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {run.best_epoch ? (run.best_epoch.overall_f1 * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.best_epoch ? (run.best_epoch.accuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.epochs.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Run Details */}
          {selectedRun && (
            <>
              {/* Best Epoch Metrics */}
              {selectedRun.best_epoch && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Run #{selectedRun.run_id}: {selectedRun.name} - Best Performance
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-700 uppercase tracking-wide">
                        Overall F1
                      </div>
                      <div className="mt-2 text-3xl font-bold text-blue-900">
                        {(selectedRun.best_epoch.overall_f1 * 100).toFixed(1)}%
                      </div>
                      <div className="mt-1 text-sm text-blue-600">
                        Epoch {selectedRun.best_epoch.epoch_number}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-green-700 uppercase tracking-wide">
                        Category F1
                      </div>
                      <div className="mt-2 text-3xl font-bold text-green-900">
                        {(selectedRun.best_epoch.category_f1 * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-purple-700 uppercase tracking-wide">
                        Risk F1
                      </div>
                      <div className="mt-2 text-3xl font-bold text-purple-900">
                        {(selectedRun.best_epoch.risk_f1 * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-orange-700 uppercase tracking-wide">
                        Accuracy
                      </div>
                      <div className="mt-2 text-3xl font-bold text-orange-900">
                        {(selectedRun.best_epoch.accuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Epoch History */}
              {selectedRun.epochs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Epoch History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Epoch
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overall F1
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category F1
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Risk F1
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Accuracy
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Playbook Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Errors
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Heuristics Added
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedRun.epochs.map((epoch) => (
                          <tr key={epoch.epoch_number} className={
                            selectedRun.best_epoch?.epoch_number === epoch.epoch_number
                              ? 'bg-yellow-50'
                              : ''
                          }>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {epoch.epoch_number}
                              {selectedRun.best_epoch?.epoch_number === epoch.epoch_number && (
                                <span className="ml-2 text-xs text-yellow-600">★ Best</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                              {(epoch.overall_f1 * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {(epoch.category_f1 * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {(epoch.risk_f1 * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {(epoch.accuracy * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {epoch.playbook_size}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {epoch.errors_found}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {epoch.heuristics_added}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Learning Progress Chart (text-based visualization) */}
              {selectedRun.epochs.length > 1 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Overall F1 Score</span>
                        <span className="font-semibold text-blue-600">
                          {(selectedRun.epochs[selectedRun.epochs.length - 1].overall_f1 * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${selectedRun.epochs[selectedRun.epochs.length - 1].overall_f1 * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Accuracy</span>
                        <span className="font-semibold text-orange-600">
                          {(selectedRun.epochs[selectedRun.epochs.length - 1].accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-orange-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${selectedRun.epochs[selectedRun.epochs.length - 1].accuracy * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-4">
                      <span className="font-medium">Improvement:</span> From {(selectedRun.epochs[0].overall_f1 * 100).toFixed(1)}% (Epoch 1)
                      to {(selectedRun.epochs[selectedRun.epochs.length - 1].overall_f1 * 100).toFixed(1)}% (Epoch {selectedRun.epochs.length})
                      {' '}
                      <span className="text-green-600 font-semibold">
                        (+{((selectedRun.epochs[selectedRun.epochs.length - 1].overall_f1 - selectedRun.epochs[0].overall_f1) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          About Training Metrics
        </h3>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>
            <strong>Overall F1:</strong> Balanced metric combining category and risk F1 scores
          </li>
          <li>
            <strong>Category F1:</strong> Macro-averaged F1 across all risk categories (suicide, NSSI, etc.)
          </li>
          <li>
            <strong>Risk F1:</strong> Macro-averaged F1 across all risk levels (CRITICAL, HIGH, MEDIUM, LOW)
          </li>
          <li>
            <strong>Playbook Size:</strong> Number of heuristic bullets accumulated during training
          </li>
          <li>
            <strong>Best Epoch:</strong> The epoch with the highest overall F1 score
          </li>
        </ul>
      </div>
    </div>
  );
}
