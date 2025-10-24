'use client';

import { useState, useEffect } from 'react';

interface PlaybookEntry {
  bullet_id: string;
  section: string | null;
  content: string | null;
  helpful_count: number | null;
  harmful_count: number | null;
  run_id: number | null;
  epoch_number: number | null;
  last_updated: Date | null;
}

// Extract risk level from content
function extractRiskLevel(content: string | null): string {
  if (!content) return 'UNKNOWN';
  const upper = content.toUpperCase();
  if (upper.includes('= CRITICAL')) return 'CRITICAL';
  if (upper.includes('= HIGH')) return 'HIGH';
  if (upper.includes('= MEDIUM')) return 'MEDIUM';
  if (upper.includes('= LOW')) return 'LOW';
  return 'OTHER';
}

export default function PlaybookPage() {
  const [playbook, setPlaybook] = useState<PlaybookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ category: string; risk: string } | null>(null);
  const [maxRunId, setMaxRunId] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'baseline' | 'best'>('best');
  const [bestRunInfo, setBestRunInfo] = useState<{run_id: number; epoch_number: number; playbook_size: number} | null>(null);
  const [tokenCount, setTokenCount] = useState<number>(0);

  useEffect(() => {
    fetchPlaybook();
    fetchBestRun();
  }, []);

  // Update token count when view mode changes
  useEffect(() => {
    if (viewMode === 'baseline') {
      // Calculate token count for baseline only
      fetch('/api/training/playbook-snapshot?run_id=1&epoch_number=1')
        .then(res => res.json())
        .then(data => setTokenCount(data.token_count || 0))
        .catch(() => setTokenCount(0));
    } else if (bestRunInfo) {
      // Token count already fetched for best run
      fetch(`/api/training/playbook-snapshot?run_id=${bestRunInfo.run_id}&epoch_number=${bestRunInfo.epoch_number}`)
        .then(res => res.json())
        .then(data => setTokenCount(data.token_count || 0))
        .catch(() => setTokenCount(0));
    }
  }, [viewMode, bestRunInfo]);

  const fetchPlaybook = async () => {
    try {
      const response = await fetch('/api/playbook');
      const data = await response.json();
      const entries = data.playbook || [];
      setPlaybook(entries);

      const max = Math.max(...entries.map((e: PlaybookEntry) => e.run_id || 0));
      setMaxRunId(max);
    } catch (error) {
      console.error('Error fetching playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBestRun = async () => {
    try {
      // Get all runs to find best epoch across all training runs
      const debugRes = await fetch('/api/debug/data-count');
      const debugData = await debugRes.json();
      const runs = debugData.runs || [];

      // Get status for each run to find best epoch
      let bestRun: {run_id: number; epoch_number: number; overall_f1: number; playbook_size: number} | null = null;

      for (const run of runs) {
        if (run.status === 'completed' || run.status === 'stopped' || run.status === 'failed' || run.status === 'running') {
          const statusRes = await fetch(`/api/training/status?run_id=${run.run_id}`);
          const statusData = await statusRes.json();

          if (statusData.best_epoch) {
            const f1 = statusData.best_epoch.overall_f1;
            if (!bestRun || f1 > bestRun.overall_f1) {
              // Get playbook size from epochs array
              const epoch = statusData.epochs.find((e: any) => e.epoch_number === statusData.best_epoch.epoch_number);
              bestRun = {
                run_id: run.run_id,
                epoch_number: statusData.best_epoch.epoch_number,
                overall_f1: f1,
                playbook_size: epoch?.playbook_size || 0
              };
            }
          }
        }
      }

      if (bestRun) {
        setBestRunInfo({
          run_id: bestRun.run_id,
          epoch_number: bestRun.epoch_number,
          playbook_size: bestRun.playbook_size
        });

        // Fetch token count for best run
        const snapshotRes = await fetch(`/api/training/playbook-snapshot?run_id=${bestRun.run_id}&epoch_number=${bestRun.epoch_number}`);
        const snapshotData = await snapshotRes.json();
        setTokenCount(snapshotData.token_count || 0);
      }
    } catch (error) {
      console.error('Error fetching best run:', error);
    }
  };

  // Get the most recent update timestamp
  const getLastUpdated = () => {
    if (playbook.length === 0) return null;
    const dates = playbook
      .map(e => e.last_updated)
      .filter(d => d != null)
      .map(d => new Date(d!));
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  const lastUpdated = getLastUpdated();

  // Export playbook to markdown
  const exportToMarkdown = () => {
    let markdown = 'You are a risk classifier that assigns a category and risk level to user input.\n\n';

    markdown += 'CATEGORIES: ';
    markdown += categories.map(c => c.key).join(', ');
    markdown += '\n\n';

    markdown += 'RISK LEVELS: CRITICAL, HIGH, MEDIUM, LOW\n\n';

    markdown += 'Use the following heuristics to guide your classification:\n\n';

    // Collect ALL heuristics directly from the playbook array
    playbook.forEach(entry => {
      if (entry.content && entry.section) {
        // Format: [category] content
        markdown += `[${entry.section}] ${entry.content}\n`;
      }
    });

    markdown += '\n';
    markdown += 'Text to classify: {{USER_INPUT}}\n\n';
    markdown += 'Respond with ONLY valid JSON in this exact format:\n';
    markdown += '{"category":"<category>","risk_level":"<risk_level>"}\n';

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbook-prompt-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Organize playbook as matrix: categories x risk levels
  const categories = [
    { key: 'suicide', label: 'Suicide' },
    { key: 'nssi', label: 'NSSI' },
    { key: 'child_abuse', label: 'Child Abuse' },
    { key: 'domestic_violence', label: 'Domestic Violence' },
    { key: 'sexual_violence', label: 'Sexual Violence' },
    { key: 'elder_abuse', label: 'Elder Abuse' },
    { key: 'homicide', label: 'Homicide' },
    { key: 'psychosis', label: 'Psychosis' },
    { key: 'manic_episode', label: 'Manic Episode' },
    { key: 'eating_disorder', label: 'Eating Disorder' },
    { key: 'substance_abuse', label: 'Substance Abuse' },
    { key: 'other_emergency', label: 'Other Emergency' },
  ];

  const riskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  // Filter playbook based on view mode
  const filteredPlaybook = viewMode === 'baseline'
    ? playbook.filter(e => e.run_id === null) // Only baseline entries
    : bestRunInfo
      ? playbook.filter(e =>
          e.run_id === null || // Baseline entries
          (e.run_id === bestRunInfo.run_id && e.epoch_number !== null && e.epoch_number < bestRunInfo.epoch_number) // Best run entries before epoch
        )
      : playbook.filter(e => e.run_id === null); // Fallback to baseline if no best run

  // Group all entries by category and risk level
  const entriesByCell: Record<string, Record<string, PlaybookEntry[]>> = {};
  categories.forEach(cat => {
    entriesByCell[cat.key] = {};
    riskLevels.forEach(level => {
      entriesByCell[cat.key][level] = [];
    });
  });

  filteredPlaybook.forEach(entry => {
    const section = entry.section || 'other_emergency';
    const riskLevel = extractRiskLevel(entry.content);
    if (entriesByCell[section] && riskLevel !== 'UNKNOWN' && riskLevel !== 'OTHER') {
      entriesByCell[section][riskLevel].push(entry);
    }
  });

  // Sort entries within each cell by run_id/epoch_number (baseline first, then by run/epoch)
  Object.keys(entriesByCell).forEach(category => {
    Object.keys(entriesByCell[category]).forEach(risk => {
      entriesByCell[category][risk].sort((a, b) => {
        // Baseline (run_id = null) comes first
        if (a.run_id === null && b.run_id !== null) return -1;
        if (a.run_id !== null && b.run_id === null) return 1;
        if (a.run_id === null && b.run_id === null) return 0;

        // Sort by run_id, then epoch_number
        if (a.run_id !== b.run_id) return (a.run_id || 0) - (b.run_id || 0);
        return (a.epoch_number || 0) - (b.epoch_number || 0);
      });
    });
  });

  // Get the most recent entry for display in the matrix
  const getLatestEntry = (category: string, risk: string): PlaybookEntry | null => {
    const entries = entriesByCell[category]?.[risk] || [];
    return entries.length > 0 ? entries[entries.length - 1] : null;
  };

  // Get all revisions for a cell
  const getRevisions = (category: string, risk: string): PlaybookEntry[] => {
    return entriesByCell[category]?.[risk] || [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading playbook...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Classification Playbook</h1>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {lastUpdated.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Category × Risk Level Matrix (Click cells to view revision history)</p>

          {/* Playbook Info */}
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">
              {viewMode === 'baseline' ? (
                <>Showing: <span className="text-blue-600">48 Baseline Heuristics</span></>
              ) : bestRunInfo ? (
                <>Showing: <span className="text-blue-600">Run #{bestRunInfo.run_id}, Epoch {bestRunInfo.epoch_number} - {bestRunInfo.playbook_size} Heuristics</span></>
              ) : (
                <>Showing: <span className="text-blue-600">48 Baseline Heuristics</span></>
              )}
            </span>
            <span className="text-gray-600">
              Token Size: <span className="font-semibold text-gray-900">{tokenCount.toLocaleString()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Button */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('baseline')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'baseline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Baseline (48)
            </button>
            <button
              onClick={() => setViewMode('best')}
              disabled={!bestRunInfo}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'best'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {bestRunInfo ? `Best Run (${bestRunInfo.playbook_size})` : 'Best Run'}
            </button>
          </div>

          <button
            onClick={exportToMarkdown}
            disabled={playbook.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
            title="Export playbook to markdown file"
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export
        </button>
      </div>
      </div>

      {playbook.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">No playbook entries yet.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left p-2 font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[140px]">
                  Category
                </th>
                {riskLevels.map(level => (
                  <th key={level} className="text-center p-2 font-semibold text-gray-700 min-w-[250px]">
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr key={category.key} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium text-gray-900 sticky left-0 bg-white border-r">
                    {category.label}
                  </td>
                  {riskLevels.map(level => {
                    const latestEntry = getLatestEntry(category.key, level);
                    const revisions = getRevisions(category.key, level);

                    if (!latestEntry) {
                      return (
                        <td key={level} className="p-2 text-center text-gray-400">
                          —
                        </td>
                      );
                    }

                    const isNew = latestEntry.run_id === maxRunId && maxRunId > 0;
                    const hasMultipleRevisions = revisions.length > 1;

                    return (
                      <td
                        key={level}
                        className={`p-2 relative cursor-pointer hover:bg-blue-50 ${
                          isNew ? 'bg-green-50' : ''
                        }`}
                        onClick={() => setSelectedCell({ category: category.key, risk: level })}
                        title="Click to view revision history"
                      >
                        {isNew && (
                          <span className="absolute top-1 right-1 px-1 py-0.5 text-[10px] bg-green-600 text-white rounded">
                            NEW
                          </span>
                        )}
                        {hasMultipleRevisions && (
                          <span className="absolute top-1 left-1 px-1 py-0.5 text-[10px] bg-blue-600 text-white rounded">
                            {revisions.length} versions
                          </span>
                        )}
                        <div className="text-xs text-gray-700 leading-tight mt-4">
                          {latestEntry.content?.replace(/\s*=\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*risk\.?$/i, '')}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                          {latestEntry.run_id ? (
                            <>
                              <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                                R{latestEntry.run_id}
                              </span>
                              {latestEntry.epoch_number && (
                                <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  E{latestEntry.epoch_number}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">Baseline</span>
                          )}
                        </div>
                        {/* Effectiveness indicator */}
                        {((latestEntry.helpful_count || 0) + (latestEntry.harmful_count || 0)) > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px]">
                            <span
                              className="px-1 py-0.5 bg-green-100 text-green-700 rounded cursor-help"
                              title="Helpful: Number of times this heuristic was cited during Generator classification that resulted in a CORRECT prediction. The Generator cites which heuristics it uses for each classification, and we track whether those led to correct or incorrect results."
                            >
                              ✓ {latestEntry.helpful_count || 0}
                            </span>
                            <span
                              className="px-1 py-0.5 bg-red-100 text-red-700 rounded cursor-help"
                              title="Harmful: Number of times this heuristic was cited during Generator classification that resulted in an INCORRECT prediction. This helps identify heuristics that may be misleading or need refinement."
                            >
                              ✗ {latestEntry.harmful_count || 0}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revision History Modal */}
      {selectedCell && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {categories.find(c => c.key === selectedCell.category)?.label} - {selectedCell.risk} Risk
                </h2>
                <p className="text-sm text-gray-600">Revision History</p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {getRevisions(selectedCell.category, selectedCell.risk).map((entry, index) => {
                const isBaseline = entry.run_id === null;
                const isLatest = index === getRevisions(selectedCell.category, selectedCell.risk).length - 1;

                return (
                  <div
                    key={entry.bullet_id}
                    className={`mb-4 p-4 rounded-lg border-2 ${
                      isLatest ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isBaseline ? (
                          <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded font-semibold">
                            Baseline
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-semibold">
                              Run #{entry.run_id}
                            </span>
                            {entry.epoch_number && (
                              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded font-semibold">
                                Epoch {entry.epoch_number}
                              </span>
                            )}
                          </>
                        )}
                        {isLatest && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-semibold">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.last_updated ? new Date(entry.last_updated).toLocaleString() : 'N/A'}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-xs text-gray-600 font-semibold mb-1">Bullet ID:</div>
                      <div className="text-xs text-gray-800 font-mono bg-white px-2 py-1 rounded">
                        {entry.bullet_id}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-xs text-gray-600 font-semibold mb-1">Content:</div>
                      <div className="text-sm text-gray-800 bg-white px-3 py-2 rounded leading-relaxed">
                        {entry.content}
                      </div>
                    </div>

                    {/* Effectiveness Metrics */}
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Effectiveness:</div>
                      <div className="flex items-center gap-3 bg-white px-3 py-2 rounded">
                        <div
                          className="flex items-center gap-1 cursor-help"
                          title="Helpful: Number of times this heuristic was cited during Generator classification that resulted in a CORRECT prediction. The Generator cites which heuristics it uses for each classification, and we track whether those led to correct or incorrect results."
                        >
                          <span className="text-xs text-gray-600">Helpful:</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">
                            {entry.helpful_count || 0}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1 cursor-help"
                          title="Harmful: Number of times this heuristic was cited during Generator classification that resulted in an INCORRECT prediction. This helps identify heuristics that may be misleading or need refinement."
                        >
                          <span className="text-xs text-gray-600">Harmful:</span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-semibold">
                            {entry.harmful_count || 0}
                          </span>
                        </div>
                        {((entry.helpful_count || 0) + (entry.harmful_count || 0)) > 0 && (
                          <div
                            className="flex items-center gap-1 ml-auto cursor-help"
                            title="Accuracy: Percentage of times this heuristic was cited and led to a correct prediction. Calculated as: helpful / (helpful + harmful) × 100%"
                          >
                            <span className="text-xs text-gray-600">Accuracy:</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-semibold">
                              {Math.round(
                                ((entry.helpful_count || 0) /
                                  ((entry.helpful_count || 0) + (entry.harmful_count || 0))) *
                                  100
                              )}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
