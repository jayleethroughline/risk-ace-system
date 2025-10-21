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
  details: any; // JSON field containing raw agent output
}

export default function TrainPage() {
  const [runId, setRunId] = useState<number | null>(null);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentSample, setCurrentSample] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [trainingData, setTrainingData] = useState('');
  const [evalData, setEvalData] = useState('');
  const [maxEpochs, setMaxEpochs] = useState(10);
  const [plateauThreshold, setPlateauThreshold] = useState(0.01);
  const [plateauPatience, setPlateauPatience] = useState(3);

  // Load active training from localStorage on mount
  useEffect(() => {
    const storedRunId = localStorage.getItem('activeTrainingRunId');
    if (storedRunId) {
      const id = parseInt(storedRunId, 10);
      setRunId(id);
      setIsPolling(true);
    }
  }, []);

  // Save/clear active training to localStorage
  useEffect(() => {
    if (runId && isPolling) {
      localStorage.setItem('activeTrainingRunId', runId.toString());
    } else {
      localStorage.removeItem('activeTrainingRunId');
    }
  }, [runId, isPolling]);

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
    const interval = setInterval(fetchLogs, 2000); // Refresh logs every 2 seconds for real-time updates
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Max Epochs
                    <span
                      className="text-gray-400 cursor-help"
                      title="Multi-epoch adaptation: The ACE framework revisits the same training data multiple times to progressively refine the playbook. Each epoch generates new heuristics through the Generator-Reflector-Curator cycle, building a comprehensive context that prevents collapse while allowing steady growth."
                    >
                      ⓘ
                    </span>
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Plateau Threshold
                    <span
                      className="text-gray-400 cursor-help"
                      title="Minimum classification improvement required to continue training. For example, 0.01 means the F1 score must improve by at least 1% to justify another epoch. This prevents the system from continuing when the playbook has reached its optimal state for the current data."
                    >
                      ⓘ
                    </span>
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
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Plateau Patience
                    <span
                      className="text-gray-400 cursor-help"
                      title="Number of consecutive epochs without sufficient improvement before stopping early. For example, patience=3 means training stops if F1 score doesn't improve by the threshold amount for 3 epochs in a row. This balances thorough context refinement with efficient resource use."
                    >
                      ⓘ
                    </span>
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
            {/* Action Buttons */}
            {status && (status.status === 'completed' || status.status === 'failed' || status.status === 'stopped') && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setRunId(null);
                    setStatus(null);
                    setLogs([]);
                    setIsPolling(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Start New Training
                </button>
              </div>
            )}

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
                  {status.progress && (
                    <>
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
                    </>
                  )}
                  {status.dataset && (
                    <div className="flex justify-between">
                      <span className="font-medium">Dataset:</span>
                      <span>
                        {status.dataset.training_samples} train, {status.dataset.eval_samples} eval
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Activity Card */}
            {status && status.status === 'running' && logs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Real-Time Activity</h2>
                <div className="space-y-4">
                  {/* Current Sample */}
                  {logs.filter(l => l.agent_type === 'generator').slice(-1).map(log => (
                    <div key={log.log_id} className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-blue-700">CURRENT SAMPLE</span>
                        <span className="text-xs text-gray-500">Epoch {log.epoch_number}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Input:</strong> {log.input_summary.substring(0, 200)}
                        {log.input_summary.length > 200 && '...'}
                      </div>
                    </div>
                  ))}

                  {/* Reflector Analysis */}
                  {logs.filter(l => l.agent_type === 'reflector').slice(-3).reverse().map(log => (
                    <div
                      key={log.log_id}
                      className="bg-orange-50 border border-orange-200 rounded p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-orange-700">REFLECTOR ANALYSIS</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-orange-600 ml-auto">Click to view raw JSON →</span>
                      </div>
                      <div className="text-xs text-gray-700 space-y-1">
                        <div><strong>Found:</strong> {log.output_summary.substring(0, 150)}
                        {log.output_summary.length > 150 && '...'}</div>
                      </div>
                    </div>
                  ))}

                  {/* Curator Additions */}
                  {logs.filter(l => l.agent_type === 'curator').slice(-3).reverse().map(log => (
                    <div key={log.log_id} className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-green-700">CURATOR PLAYBOOK UPDATE</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700">
                        <strong>Added:</strong> {log.output_summary.substring(0, 150)}
                        {log.output_summary.length > 150 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Card */}
            {status && status.epochs && status.epochs.length > 0 && (
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
                  const generatorLog = logs.find(
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
                  const reflectorLog = logs.find(
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
                  const curatorLog = logs.find(
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
    </div>
  );
}
