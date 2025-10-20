'use client';

import { useState, useEffect } from 'react';

interface PlaybookEntry {
  bullet_id: string;
  section: string | null;
  content: string | null;
  helpful_count: number | null;
  harmful_count: number | null;
  last_updated: Date | null;
}

export default function PlaybookPage() {
  const [playbook, setPlaybook] = useState<PlaybookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetchPlaybook();
  }, []);

  const fetchPlaybook = async () => {
    try {
      const response = await fetch('/api/playbook');
      const data = await response.json();
      setPlaybook(data.playbook || []);
    } catch (error) {
      console.error('Error fetching playbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: PlaybookEntry) => {
    setEditingId(entry.bullet_id);
    setEditContent(entry.content || '');
  };

  const handleSave = async (bullet_id: string) => {
    try {
      await fetch('/api/playbook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullet_id, content: editContent }),
      });
      setEditingId(null);
      fetchPlaybook();
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry');
    }
  };

  const handleDelete = async (bullet_id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await fetch(`/api/playbook?bullet_id=${bullet_id}`, {
        method: 'DELETE',
      });
      fetchPlaybook();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleAdd = async () => {
    if (!newSection.trim() || !newContent.trim()) {
      alert('Please fill in both section and content');
      return;
    }

    try {
      await fetch('/api/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: newSection, content: newContent }),
      });
      setNewSection('');
      setNewContent('');
      setShowAddForm(false);
      fetchPlaybook();
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Failed to add entry');
    }
  };

  const handleVote = async (bullet_id: string, type: 'helpful' | 'harmful') => {
    const entry = playbook.find((e) => e.bullet_id === bullet_id);
    if (!entry) return;

    const updates: any = { bullet_id };
    if (type === 'helpful') {
      updates.helpful_count = (entry.helpful_count || 0) + 1;
    } else {
      updates.harmful_count = (entry.harmful_count || 0) + 1;
    }

    try {
      await fetch('/api/playbook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchPlaybook();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const groupedPlaybook = playbook.reduce((acc, entry) => {
    const section = entry.section || 'uncategorized';
    if (!acc[section]) acc[section] = [];
    acc[section].push(entry);
    return acc;
  }, {} as Record<string, PlaybookEntry[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading playbook...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Classification Playbook
          </h1>
          <p className="mt-2 text-gray-600">
            Heuristics and rules for risk classification
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showAddForm ? 'Cancel' : 'Add Entry'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Entry</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., suicidal_ideation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter heuristic..."
              />
            </div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Entry
            </button>
          </div>
        </div>
      )}

      {Object.keys(groupedPlaybook).length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            No playbook entries yet. Run the ACE cycle to generate heuristics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPlaybook).map(([section, entries]) => (
            <div key={section} className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 capitalize">
                {section.replace(/_/g, ' ')}
              </h2>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.bullet_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    {editingId === entry.bullet_id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(entry.bullet_id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700">{entry.content}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex space-x-4 text-sm text-gray-500">
                            <span>👍 {entry.helpful_count || 0}</span>
                            <span>👎 {entry.harmful_count || 0}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleVote(entry.bullet_id, 'helpful')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Helpful
                            </button>
                            <button
                              onClick={() => handleVote(entry.bullet_id, 'harmful')}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Harmful
                            </button>
                            <button
                              onClick={() => handleEdit(entry)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.bullet_id)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
