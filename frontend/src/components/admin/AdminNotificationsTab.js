import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_URL;

const TARGET_OPTIONS = [
  { value: 'all', label: '🌐 Everyone (all users & professionals)' },
  { value: 'all_patients', label: '🧑‍⚕️ All Patients' },
  { value: 'all_professionals', label: '👨‍💼 All Professionals (pharmacists, doctors, nutritionists)' },
  { value: 'all_pharmacists', label: '💊 All Pharmacists' },
  { value: 'all_doctors', label: '🩺 All Doctors' },
  { value: 'all_nutritionists', label: '🥗 All Nutritionists' },
  { value: 'individual', label: '👤 Individual User(s)' },
];

export default function AdminNotificationsTab() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  // Individual targeting
  const [targets, setTargets] = useState({ patients: [], pharmacists: [], doctors: [], nutritionists: [] });
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('patients');

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTargets = useCallback(async () => {
    if (loadingTargets || targets.patients.length) return;
    setLoadingTargets(true);
    try {
      const res = await axios.get(`${API}/admin/notification-targets`, { headers });
      setTargets(res.data);
    } catch {
      toast.error('Failed to load user list');
    } finally {
      setLoadingTargets(false);
    }
  }, [loadingTargets, targets.patients.length]);

  useEffect(() => {
    if (target === 'individual') fetchTargets();
  }, [target]);

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/admin/notifications-history?page=${page}`, { headers });
      setHistory(res.data.notifications || []);
      setHistoryTotal(res.data.total || 0);
      setHistoryPage(page);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) fetchHistory(1);
  }, [showHistory]);

  const toggleUser = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (target === 'individual' && selectedIds.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }

    setSending(true);
    try {
      const res = await axios.post(`${API}/admin/send-notification`, {
        title: title.trim(),
        message: message.trim(),
        target,
        userIds: target === 'individual' ? selectedIds : undefined,
      }, { headers });

      toast.success(`✅ Sent to ${res.data.count} recipient(s)`);
      setTitle('');
      setMessage('');
      setSelectedIds([]);
      setTarget('all');
      if (showHistory) fetchHistory(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const currentGroup = targets[activeGroup] || [];
  const filtered = currentGroup.filter(u =>
    !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupTabs = [
    { key: 'patients', label: 'Patients', count: targets.patients.length },
    { key: 'pharmacists', label: 'Pharmacists', count: targets.pharmacists.length },
    { key: 'doctors', label: 'Doctors', count: targets.doctors.length },
    { key: 'nutritionists', label: 'Nutritionists', count: targets.nutritionists.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🔔 Send Notification</h2>
          <p className="text-sm text-gray-500 mt-1">Send in-app notifications to users or professionals</p>
        </div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showHistory ? 'Hide History' : 'View Sent History'}
        </button>
      </div>

      {/* Compose Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
        {/* Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
          <select
            value={target}
            onChange={e => { setTarget(e.target.value); setSelectedIds([]); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TARGET_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Individual picker */}
        {target === 'individual' && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Group tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {groupTabs.map(g => (
                <button
                  key={g.key}
                  onClick={() => { setActiveGroup(g.key); setSearchQuery(''); }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeGroup === g.key
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g.label} {g.count > 0 && <span className="ml-1 text-gray-400">({g.count})</span>}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* User list */}
            <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
              {loadingTargets ? (
                <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No users found</div>
              ) : filtered.map(u => (
                <label key={u._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u._id)}
                    onChange={() => toggleUser(u._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>

            {selectedIds.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 font-medium">
                {selectedIds.length} recipient{selectedIds.length > 1 ? 's' : ''} selected
                <button onClick={() => setSelectedIds([])} className="ml-2 text-blue-400 hover:text-blue-600">Clear</button>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notification Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. System Maintenance Notice"
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your notification message here..."
            rows={4}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
        </div>

        {/* Preview */}
        {(title || message) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔔</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title || 'Notification Title'}</p>
                <p className="text-sm text-gray-600 mt-0.5">{message || 'Your message will appear here.'}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>🚀 Send Notification</>
          )}
        </button>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Sent Notifications History</h3>
            <span className="text-sm text-gray-400">{historyTotal} total</span>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No notifications sent yet</div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {history.map(n => (
                  <div key={n._id} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm">🔔</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                          {n.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          To: {n.userId?.name || 'Unknown'} ({n.userId?.role || '—'})
                        </span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {historyTotal > 20 && (
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage === 1}
                    className="text-sm text-blue-600 disabled:text-gray-300 hover:underline"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-gray-400">Page {historyPage} of {Math.ceil(historyTotal / 20)}</span>
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= Math.ceil(historyTotal / 20)}
                    className="text-sm text-blue-600 disabled:text-gray-300 hover:underline"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
