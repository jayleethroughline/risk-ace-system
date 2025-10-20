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

interface Reflection {
  reflection_id: number;
  run_id: number;
  epoch_number: number;
  error_type: string;
  correct_approach: string;
  key_insight: string;
  affected_section: string;
  tag: string;
  input_text: string;
  predicted: string;
  expected: string;
  created_at: string;
}

interface Heuristic {
  bullet_id: string;
  section: string;
  content: string;
  helpful_count: number;
  harmful_count: number;
  run_id: number;
  epoch_number: number;
  last_updated: string;
}

export default function MetricsPage() {
  const [runs, setRuns] = useState<TrainingRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [heuristics, setHeuristics] = useState<Heuristic[]>([]);
  const [expandedEpochs, setExpandedEpochs] = useState<Set<number>>(new Set());
  const [stoppingRunId, setStoppingRunId] = useState<number | null>(null);

  useEffect(() => {
    fetchAllRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchAgentWork(selectedRunId);
    }
  }, [selectedRunId]);

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

  const fetchAgentWork = async (runId: number) => {
    try {
      const [reflectionsRes, heuristicsRes] = await Promise.all([
        fetch(`/api/training/reflections?run_id=${runId}`),
        fetch(`/api/training/heuristics?run_id=${runId}`)
      ]);

      const reflectionsData = await reflectionsRes.json();
      const heuristicsData = await heuristicsRes.json();

      setReflections(reflectionsData);
      setHeuristics(heuristicsData);
    } catch (error) {
      console.error('Error fetching agent work:', error);
    }
  };

  const toggleEpoch = (epochNumber: number) => {
    setExpandedEpochs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epochNumber)) {
        newSet.delete(epochNumber);
      } else {
        newSet.add(epochNumber);
      }
      return newSet;
    });
  };

  const stopRun = async (runId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row selection

    if (!confirm(`Are you sure you want to stop training run #${runId}?`)) {
      return;
    }

    setStoppingRunId(runId);
    try {
      const response = await fetch('/api/training/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ run_id: runId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop training run');
      }

      // Refresh runs list
      await fetchAllRuns();
    } catch (error) {
      console.error('Error stopping run:', error);
      alert(error instanceof Error ? error.message : 'Failed to stop training run');
    } finally {
      setStoppingRunId(null);
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
      case 'stopped': return 'text-orange-600 bg-orange-100';
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            View performance metrics and epoch history for all training runs
          </p>
        </div>
        <a
          href="/train"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Training Orchestration
        </a>
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
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(run.status)}`}>
                            {run.status}
                          </span>
                          {run.status === 'running' && (
                            <button
                              onClick={(e) => stopRun(run.run_id, e)}
                              disabled={stoppingRunId === run.run_id}
                              className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Stop training run"
                            >
                              {stoppingRunId === run.run_id ? 'Stopping...' : 'Stop'}
                            </button>
                          )}
                        </div>
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

              {/* Agent Work: Reflector & Curator */}
              {selectedRun.epochs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Reflector & Curator Work</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View what the Reflector (error analysis) and Curator (heuristic generation) agents did in each epoch
                  </p>
                  <div className="space-y-2">
                    {selectedRun.epochs.map((epoch) => {
                      const epochReflections = reflections.filter(r => r.epoch_number === epoch.epoch_number);
                      const epochHeuristics = heuristics.filter(h => h.epoch_number === epoch.epoch_number);
                      const isExpanded = expandedEpochs.has(epoch.epoch_number);

                      return (
                        <div key={epoch.epoch_number} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleEpoch(epoch.epoch_number)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-left"
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-gray-900">
                                Epoch {epoch.epoch_number}
                              </span>
                              <span className="text-sm text-gray-600">
                                {epochReflections.length} reflection{epochReflections.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-sm text-gray-600">
                                {epochHeuristics.length} heuristic{epochHeuristics.length !== 1 ? 's' : ''} added
                              </span>
                            </div>
                            <span className="text-gray-500">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {/* Reflections Section */}
                              {epochReflections.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                                    <span className="text-lg">🔍</span>
                                    Reflector Analysis ({epochReflections.length})
                                  </h4>
                                  <div className="space-y-3">
                                    {epochReflections.map((reflection) => (
                                      <div key={reflection.reflection_id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs font-semibold rounded">
                                                {reflection.error_type}
                                              </span>
                                              {reflection.tag && (
                                                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                                  {reflection.tag}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-sm">
                                              <div className="text-gray-600 mb-1">
                                                <span className="font-medium">Input:</span> {reflection.input_text}
                                              </div>
                                              <div className="flex gap-4 text-xs">
                                                <div>
                                                  <span className="text-red-600 font-medium">Predicted:</span> {reflection.predicted}
                                                </div>
                                                <div>
                                                  <span className="text-green-600 font-medium">Expected:</span> {reflection.expected}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-sm space-y-1">
                                              <div>
                                                <span className="font-medium text-gray-700">Key Insight:</span>{' '}
                                                <span className="text-gray-600">{reflection.key_insight}</span>
                                              </div>
                                              <div>
                                                <span className="font-medium text-gray-700">Correct Approach:</span>{' '}
                                                <span className="text-gray-600">{reflection.correct_approach}</span>
                                              </div>
                                              {reflection.affected_section && (
                                                <div>
                                                  <span className="font-medium text-gray-700">Affected Section:</span>{' '}
                                                  <span className="text-gray-600">{reflection.affected_section}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Heuristics Section */}
                              {epochHeuristics.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                                    <span className="text-lg">📝</span>
                                    Curator Heuristics ({epochHeuristics.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {epochHeuristics.map((heuristic) => (
                                      <div key={heuristic.bullet_id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded">
                                                {heuristic.section}
                                              </span>
                                              <div className="flex gap-2 text-xs text-gray-600">
                                                <span>👍 {heuristic.helpful_count}</span>
                                                <span>👎 {heuristic.harmful_count}</span>
                                              </div>
                                            </div>
                                            <div className="text-sm text-gray-700">
                                              {heuristic.content}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {epochReflections.length === 0 && epochHeuristics.length === 0 && (
                                <div className="text-sm text-gray-500 italic">
                                  No reflections or heuristics recorded for this epoch
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
