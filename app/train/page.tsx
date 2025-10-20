'use client';

import { useState, useEffect } from 'react';

interface TrainingStatus {
  run_id: number;
  name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  config: {
    max_epochs: number;
    plateau_threshold: number;
    plateau_patience: number;
  };
  dataset: {
    training_samples: number;
    eval_samples: number;
  };
  progress: {
    current_epoch: number;
    max_epochs: number;
    progress_percent: number;
  };
  epochs: Array<{
    epoch_number: number;
    overall_f1: number;
    category_f1: number;
    risk_f1: number;
    accuracy: number;
    playbook_size: number;
    errors_found: number;
    heuristics_added: number;
  }>;
  best_epoch: {
    epoch_number: number;
    overall_f1: number;
    category_f1: number;
    risk_f1: number;
    accuracy: number;
  } | null;
  plateau_status: {
    should_stop: boolean;
    epochs_without_improvement: number;
    best_epoch: number;
    best_f1: number;
    current_f1: number;
    improvement: number;
    message: string;
  } | null;
}

interface AgentLog {
  log_id: number;
  epoch_number: number;
  agent_type: string;
  system_prompt: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
}

export default function TrainPage() {
  const [runId, setRunId] = useState<number | null>(null);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [trainingData, setTrainingData] = useState('');
  const [evalData, setEvalData] = useState('');
  const [maxEpochs, setMaxEpochs] = useState(10);
  const [plateauThreshold, setPlateauThreshold] = useState(0.01);
  const [plateauPatience, setPlateauPatience] = useState(3);

  // Poll for status updates
  useEffect(() => {
    if (!runId || !isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/training/status?run_id=${runId}`);
        const data = await res.json();
        setStatus(data);

        // Stop polling if training is completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [runId, isPolling]);

  // Fetch logs when run_id changes
  useEffect(() => {
    if (!runId) return;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/training/logs?run_id=${runId}`);
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Refresh logs every 5 seconds
    return () => clearInterval(interval);
  }, [runId]);

  const handleStartTraining = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          training_data: trainingData,
          eval_data: evalData,
          max_epochs: maxEpochs,
          plateau_threshold: plateauThreshold,
          plateau_patience: plateauPatience,
          auto_start: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start training');
        setLoading(false);
        return;
      }

      setRunId(data.run_id);
      setIsPolling(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to start training');
      setLoading(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setter(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Training Orchestration</h1>

        {!runId ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Start New Training Run</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Training Run Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Initial Training Run"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Training Data (CSV or JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => handleFileUpload(e, setTrainingData)}
                  className="w-full border rounded px-3 py-2"
                />
                {trainingData && (
                  <p className="text-sm text-gray-500 mt-1">
                    {trainingData.split('\n').length} lines loaded
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Evaluation Data (CSV or JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => handleFileUpload(e, setEvalData)}
                  className="w-full border rounded px-3 py-2"
                />
                {evalData && (
                  <p className="text-sm text-gray-500 mt-1">
                    {evalData.split('\n').length} lines loaded
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Epochs
                  </label>
                  <input
                    type="number"
                    value={maxEpochs}
                    onChange={(e) => setMaxEpochs(parseInt(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Plateau Threshold
                  </label>
                  <input
                    type="number"
                    value={plateauThreshold}
                    onChange={(e) => setPlateauThreshold(parseFloat(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Plateau Patience
                  </label>
                  <input
                    type="number"
                    value={plateauPatience}
                    onChange={(e) => setPlateauPatience(parseInt(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>

              <button
                onClick={handleStartTraining}
                disabled={loading || !name || !trainingData || !evalData}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                {loading ? 'Starting...' : 'Start Training'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Training Status</h2>
              {status && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Run ID:</span>
                    <span>{status.run_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{status.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        status.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : status.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : status.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {status.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Progress:</span>
                    <span>
                      Epoch {status.progress.current_epoch} / {status.progress.max_epochs}{' '}
                      ({status.progress.progress_percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${status.progress.progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Dataset:</span>
                    <span>
                      {status.dataset.training_samples} train, {status.dataset.eval_samples} eval
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Card */}
            {status && status.epochs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
                <div className="space-y-4">
                  {/* Best Epoch */}
                  {status.best_epoch && (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <h3 className="font-semibold mb-2">Best Epoch: {status.best_epoch.epoch_number}</h3>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Overall F1</div>
                          <div className="font-bold">{status.best_epoch.overall_f1.toFixed(4)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Category F1</div>
                          <div className="font-bold">{status.best_epoch.category_f1.toFixed(4)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Risk F1</div>
                          <div className="font-bold">{status.best_epoch.risk_f1.toFixed(4)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Accuracy</div>
                          <div className="font-bold">{status.best_epoch.accuracy.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plateau Status */}
                  {status.plateau_status && (
                    <div
                      className={`border rounded p-4 ${
                        status.plateau_status.should_stop
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <h3 className="font-semibold mb-2">Plateau Detection</h3>
                      <p className="text-sm">{status.plateau_status.message}</p>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                          <div className="text-gray-600">Epochs Without Improvement</div>
                          <div className="font-bold">{status.plateau_status.epochs_without_improvement}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Improvement</div>
                          <div className="font-bold">
                            {(status.plateau_status.improvement * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Epoch History */}
                  <div>
                    <h3 className="font-semibold mb-2">Epoch History</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Epoch</th>
                            <th className="px-4 py-2 text-left">Overall F1</th>
                            <th className="px-4 py-2 text-left">Category F1</th>
                            <th className="px-4 py-2 text-left">Risk F1</th>
                            <th className="px-4 py-2 text-left">Accuracy</th>
                            <th className="px-4 py-2 text-left">Playbook Size</th>
                            <th className="px-4 py-2 text-left">Errors</th>
                            <th className="px-4 py-2 text-left">Heuristics Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {status.epochs.map((epoch) => (
                            <tr key={epoch.epoch_number} className="border-t">
                              <td className="px-4 py-2">{epoch.epoch_number}</td>
                              <td className="px-4 py-2">{epoch.overall_f1.toFixed(4)}</td>
                              <td className="px-4 py-2">{epoch.category_f1.toFixed(4)}</td>
                              <td className="px-4 py-2">{epoch.risk_f1.toFixed(4)}</td>
                              <td className="px-4 py-2">{epoch.accuracy.toFixed(4)}</td>
                              <td className="px-4 py-2">{epoch.playbook_size}</td>
                              <td className="px-4 py-2">{epoch.errors_found}</td>
                              <td className="px-4 py-2">{epoch.heuristics_added}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Logs */}
            {logs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Agent Activity Logs</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.log_id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              log.agent_type === 'generator'
                                ? 'bg-blue-100 text-blue-700'
                                : log.agent_type === 'reflector'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {log.agent_type.toUpperCase()}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            Epoch {log.epoch_number}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">System Prompt:</span> {log.system_prompt}
                        </div>
                        <div>
                          <span className="font-medium">Input:</span> {log.input_summary}
                        </div>
                        <div>
                          <span className="font-medium">Output:</span> {log.output_summary}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
