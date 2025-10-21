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

interface AgentLog {
  log_id: number;
  epoch_number: number;
  agent_type: string;
  system_prompt: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
  details: any;
}

interface DatasetSample {
  data_id: number;
  data_type: string;
  text: string;
  true_category: string;
  true_risk: string;
}

interface DatasetData {
  run_id: number;
  train: DatasetSample[];
  eval: DatasetSample[];
}

export default function MetricsPage() {
  const [runs, setRuns] = useState<TrainingRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [heuristics, setHeuristics] = useState<Heuristic[]>([]);
  const [expandedEpochs, setExpandedEpochs] = useState<Set<number>>(new Set());
  const [stoppingRunId, setStoppingRunId] = useState<number | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetData, setDatasetData] = useState<DatasetData | null>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [activeTab, setActiveTab] = useState<'train' | 'eval'>('train');

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
        // Don't auto-expand - let user click to expand
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentWork = async (runId: number) => {
    try {
      const [reflectionsRes, heuristicsRes, logsRes] = await Promise.all([
        fetch(`/api/training/reflections?run_id=${runId}`),
        fetch(`/api/training/heuristics?run_id=${runId}`),
        fetch(`/api/training/logs?run_id=${runId}`)
      ]);

      const reflectionsData = await reflectionsRes.json();
      const heuristicsData = await heuristicsRes.json();
      const logsData = await logsRes.json();

      setReflections(reflectionsData);
      setHeuristics(heuristicsData);
      setAgentLogs(logsData.logs || []);
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

  const fetchDataset = async (runId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row selection

    setLoadingDataset(true);
    setShowDatasetModal(true);
    setActiveTab('train');

    try {
      const response = await fetch(`/api/training/dataset?run_id=${runId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dataset');
      }

      setDatasetData(data);
    } catch (error) {
      console.error('Error fetching dataset:', error);
      alert(error instanceof Error ? error.message : 'Failed to fetch dataset');
      setShowDatasetModal(false);
    } finally {
      setLoadingDataset(false);
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
          <h1 className="text-3xl font-bold text-gray-900">ACE Framework Dashboard</h1>
          <p className="mt-2 text-gray-600">
            <span className="font-semibold">Agent Context Engineering (ACE):</span> An iterative learning system where the{' '}
            <span className="text-blue-600 font-medium">Generator</span> classifies inputs using a playbook,{' '}
            <span className="text-purple-600 font-medium">Reflector</span> analyzes errors to identify failure patterns, and{' '}
            <span className="text-green-600 font-medium">Curator</span> generates new heuristics to improve the playbook.
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
                      onClick={() => {
                        setSelectedRunId(run.run_id);
                        // Toggle expand/collapse when clicking the same run
                        if (expandedRunId === run.run_id) {
                          setExpandedRunId(null);
                        } else {
                          setExpandedRunId(run.run_id);
                        }
                      }}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedRunId === run.run_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className={`transform transition-transform duration-200 ${
                            expandedRunId === run.run_id ? 'rotate-90' : ''
                          }`}>
                            ▶
                          </span>
                          #{run.run_id}
                        </div>
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
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer hover:text-blue-800 hover:bg-blue-50"
                        onClick={(e) => fetchDataset(run.run_id, e)}
                        title="Click to view training and evaluation data"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📊</span>
                          <span>{run.dataset.training_samples} train / {run.dataset.eval_samples} eval</span>
                        </div>
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
          {selectedRun && expandedRunId === selectedRunId && (
            <div className="space-y-6 animate-in slide-in-from-top duration-300">
              {/* Epoch History */}
              {selectedRun.epochs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Epoch History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              Epoch
                              <span className="text-blue-600 normal-case text-[10px] font-normal">(click for details)</span>
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              Overall F1
                              <span
                                className="text-gray-400 cursor-help"
                                title="Harmonic mean of precision and recall across both category and risk level predictions. This is the primary metric measuring how well the system balances correct predictions with minimizing false positives and false negatives."
                              >
                                ⓘ
                              </span>
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              Category F1
                              <span
                                className="text-gray-400 cursor-help"
                                title="F1 score for predicting the correct category (e.g., suicide, NSSI, domestic violence). Measures how accurately the system identifies the type of crisis regardless of risk level."
                              >
                                ⓘ
                              </span>
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              Risk F1
                              <span
                                className="text-gray-400 cursor-help"
                                title="F1 score for predicting the correct risk level (CRITICAL, HIGH, MEDIUM, LOW). Measures how accurately the system assesses urgency regardless of category."
                              >
                                ⓘ
                              </span>
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              Accuracy
                              <span
                                className="text-gray-400 cursor-help"
                                title="Percentage of samples where both category and risk level were predicted correctly. This is the strictest metric - only exact matches count as correct."
                              >
                                ⓘ
                              </span>
                            </span>
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
                          <tr
                            key={epoch.epoch_number}
                            className={`cursor-pointer hover:bg-gray-100 transition-colors ${
                              selectedRun.best_epoch?.epoch_number === epoch.epoch_number
                                ? 'bg-yellow-50'
                                : ''
                            }`}
                            onClick={() => {
                              // Find any log from this epoch to trigger the modal
                              const epochLog = agentLogs.find(log => log.epoch_number === epoch.epoch_number);
                              if (epochLog) setSelectedLog(epochLog);
                            }}
                            title="Click to view Agent Cycle Details"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{epoch.epoch_number}</span>
                                {selectedRun.best_epoch?.epoch_number === epoch.epoch_number && (
                                  <span className="text-xs text-yellow-600">★ Best</span>
                                )}
                              </div>
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

                  {/* Best Epoch Improvement Summary */}
                  {selectedRun.best_epoch && selectedRun.epochs.length > 1 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        📈 Best Epoch Performance (Epoch {selectedRun.best_epoch.epoch_number}) vs Initial (Epoch 1)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Overall F1</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600">
                              {(selectedRun.best_epoch.overall_f1 * 100).toFixed(1)}%
                            </span>
                            <span className={`text-xs font-semibold ${
                              (selectedRun.best_epoch.overall_f1 - selectedRun.epochs[0].overall_f1) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(selectedRun.best_epoch.overall_f1 - selectedRun.epochs[0].overall_f1) >= 0 ? '↑' : '↓'}
                              {Math.abs((selectedRun.best_epoch.overall_f1 - selectedRun.epochs[0].overall_f1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Category F1</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-purple-600">
                              {(selectedRun.best_epoch.category_f1 * 100).toFixed(1)}%
                            </span>
                            <span className={`text-xs font-semibold ${
                              (selectedRun.best_epoch.category_f1 - selectedRun.epochs[0].category_f1) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(selectedRun.best_epoch.category_f1 - selectedRun.epochs[0].category_f1) >= 0 ? '↑' : '↓'}
                              {Math.abs((selectedRun.best_epoch.category_f1 - selectedRun.epochs[0].category_f1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Risk F1</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-orange-600">
                              {(selectedRun.best_epoch.risk_f1 * 100).toFixed(1)}%
                            </span>
                            <span className={`text-xs font-semibold ${
                              (selectedRun.best_epoch.risk_f1 - selectedRun.epochs[0].risk_f1) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(selectedRun.best_epoch.risk_f1 - selectedRun.epochs[0].risk_f1) >= 0 ? '↑' : '↓'}
                              {Math.abs((selectedRun.best_epoch.risk_f1 - selectedRun.epochs[0].risk_f1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Accuracy</div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-600">
                              {(selectedRun.best_epoch.accuracy * 100).toFixed(1)}%
                            </span>
                            <span className={`text-xs font-semibold ${
                              (selectedRun.best_epoch.accuracy - selectedRun.epochs[0].accuracy) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {(selectedRun.best_epoch.accuracy - selectedRun.epochs[0].accuracy) >= 0 ? '↑' : '↓'}
                              {Math.abs((selectedRun.best_epoch.accuracy - selectedRun.epochs[0].accuracy) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                            <div className="p-4">
                              {/* Side by Side: Reflections and Heuristics */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Reflections Section */}
                                <div>
                                  {epochReflections.length > 0 ? (
                                    <>
                                      <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                                        <span className="text-lg">🔍</span>
                                        <span>Reflector Analysis ({epochReflections.length})</span>
                                        <span
                                          className="text-gray-400 cursor-help text-sm"
                                          title="Reflector: Analyzes classification errors to identify why the Generator failed. For each error, it determines the error type (e.g., risk overestimation, category misclassification), explains the correct approach, extracts key insights, and tags the failure pattern. These reflections guide the Curator in generating targeted heuristics."
                                        >
                                          ⓘ
                                        </span>
                                      </h4>
                                      <div className="space-y-3">
                                        {epochReflections.map((reflection) => {
                                          return (
                                            <div
                                              key={reflection.reflection_id}
                                              className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                                            >
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
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      No reflections recorded for this epoch
                                    </div>
                                  )}
                                </div>

                                {/* Heuristics Section */}
                                <div>
                                  {epochHeuristics.length > 0 ? (
                                    <>
                                      <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                                        <span className="text-lg">📝</span>
                                        <span>Curator Heuristics ({epochHeuristics.length})</span>
                                        <span
                                          className="text-gray-400 cursor-help text-sm"
                                          title="Curator: Generates new classification heuristics based on Reflector insights. For each reflection, it creates 1-2 actionable rules that help the Generator avoid similar errors. These heuristics are added to the playbook and include the risk level and specific guidance for classification decisions."
                                        >
                                          ⓘ
                                        </span>
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
                                                    <span
                                                      className="cursor-help"
                                                      title="Helpful: Number of times this heuristic was cited during Generator classification that resulted in a CORRECT prediction. The Generator cites which heuristics it uses for each classification, and we track whether those led to correct or incorrect results."
                                                    >
                                                      👍 {heuristic.helpful_count}
                                                    </span>
                                                    <span
                                                      className="cursor-help"
                                                      title="Harmful: Number of times this heuristic was cited during Generator classification that resulted in an INCORRECT prediction. This helps identify heuristics that may be misleading or need refinement."
                                                    >
                                                      👎 {heuristic.harmful_count}
                                                    </span>
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
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      No heuristics added for this epoch
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* JSON Viewer Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Agent Cycle Details - Epoch {selectedLog.epoch_number}
                </h3>
                <p className="text-sm text-gray-600">
                  Generator → Reflector → Curator Pipeline
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                {/* Generator Section */}
                {(() => {
                  const generatorLog = agentLogs.find(
                    log => log.agent_type === 'generator' && log.epoch_number === selectedLog.epoch_number
                  );
                  return generatorLog ? (
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <span className="text-lg">🤖</span>
                          Generator - Classifies samples using current playbook
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">System Prompt</h5>
                          <div className="bg-gray-50 rounded p-2 text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-auto">
{`You are a risk classifier that assigns a category and risk level to user input.

CATEGORIES:
- suicide
- nssi
- child_abuse
- domestic_violence
- sexual_violence
- elder_abuse
- homicide
- psychosis
- manic_episode
- eating_disorder
- substance_abuse
- other_emergency

RISK LEVELS:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Use the following heuristics to guide your classification:
\${context || 'No heuristics available yet.'}

Text to classify: "\${text}"

Respond with ONLY valid JSON in this exact format:
{"category":"<category>","risk_level":"<risk_level>"}`}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Complete Output</h5>
                          <div className="bg-gray-900 rounded p-3 overflow-x-auto max-h-96">
                            <pre className="text-xs text-green-400 font-mono">
                              {JSON.stringify(generatorLog.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Generator log not found for this epoch</div>
                  );
                })()}

                {/* Reflector Section */}
                {(() => {
                  const reflectorLog = agentLogs.find(
                    log => log.agent_type === 'reflector' && log.epoch_number === selectedLog.epoch_number
                  );
                  return reflectorLog ? (
                    <div className="border border-orange-200 rounded-lg overflow-hidden">
                      <div className="bg-orange-100 px-4 py-2 border-b border-orange-200">
                        <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                          <span className="text-lg">🔍</span>
                          Reflector - Analyzes classification errors
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">System Prompt</h5>
                          <div className="bg-gray-50 rounded p-2 text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-auto">
{`You are a reflective agent analyzing classification errors.

INPUT TEXT: "\${text}"

PREDICTED:
- Category: \${predictedCategory}
- Risk Level: \${predictedRisk}

ACTUAL (TRUE):
- Category: \${trueCategory}
- Risk Level: \${trueRisk}

Analyze this error and provide:
1. What type of error occurred (e.g., "category misclassification", "risk underestimation", "risk overestimation")
2. What the correct approach should be
3. A key insight that could help prevent similar errors
4. Which section of the playbook this affects (use the true category)
5. A short tag for this insight (e.g., "indirect_language", "context_clues")

Respond in this exact JSON format:
{
  "error_type": "<error type>",
  "correct_approach": "<correct approach>",
  "key_insight": "<key insight>",
  "affected_section": "<section>",
  "tag": "<tag>"
}`}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Complete Output</h5>
                          <div className="bg-gray-900 rounded p-3 overflow-x-auto max-h-96">
                            <pre className="text-xs text-green-400 font-mono">
                              {JSON.stringify(reflectorLog.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Reflector log not found for this epoch</div>
                  );
                })()}

                {/* Curator Section */}
                {(() => {
                  const curatorLog = agentLogs.find(
                    log => log.agent_type === 'curator' && log.epoch_number === selectedLog.epoch_number
                  );
                  return curatorLog ? (
                    <div className="border border-green-200 rounded-lg overflow-hidden">
                      <div className="bg-green-100 px-4 py-2 border-b border-green-200">
                        <h4 className="font-semibold text-green-900 flex items-center gap-2">
                          <span className="text-lg">📝</span>
                          Curator - Generates new heuristics for playbook
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">System Prompt</h5>
                          <div className="bg-gray-50 rounded p-2 text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-auto">
{`You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
\${playbookContext || 'Empty playbook'}

NEW REFLECTION:
- Error Type: \${reflection.error_type}
- Correct Approach: \${reflection.correct_approach}
- Key Insight: \${reflection.key_insight}
- Affected Section: \${reflection.affected_section}
- Tag: \${reflection.tag}

Based on this reflection, generate 1-2 NEW heuristic bullets that should be added to the playbook.
Each bullet should be:
- Actionable and specific
- Clear and concise
- Directly applicable to classification

Respond in JSON format:
{
  "bullets": [
    {
      "section": "<section name>",
      "content": "<heuristic bullet point>"
    }
  ]
}`}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Complete Output</h5>
                          <div className="bg-gray-900 rounded p-3 overflow-x-auto max-h-96">
                            <pre className="text-xs text-green-400 font-mono">
                              {JSON.stringify(curatorLog.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Curator log not found for this epoch</div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-3 border-t flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Modal */}
      {showDatasetModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDatasetModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Dataset for Run #{datasetData?.run_id}
                </h3>
                <p className="text-sm text-gray-600">
                  Training and Evaluation Data
                </p>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('train')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'train'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Training Data ({datasetData?.train.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('eval')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'eval'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Evaluation Data ({datasetData?.eval.length || 0})
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {loadingDataset ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg text-gray-600">Loading dataset...</div>
                </div>
              ) : datasetData ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Text
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Level
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(activeTab === 'train' ? datasetData.train : datasetData.eval).map((sample, index) => (
                        <tr key={sample.data_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                            <div className="whitespace-normal">{sample.text}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {sample.true_category}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              sample.true_risk === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              sample.true_risk === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              sample.true_risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {sample.true_risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500">No dataset data available</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-3 border-t flex justify-end">
              <button
                onClick={() => setShowDatasetModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
