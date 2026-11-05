import React, { useEffect, useState } from 'react';
import { MessageSquareCode, Database, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { UserFeedback } from '../types';

export const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      setFeedbacks(data.feedbackList || []);
    } catch (err) {
      console.warn('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div className="space-y-6 text-slate-200">
      
      {/* Header */}
      <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <MessageSquareCode className="w-6 h-6 text-cyan-400" />
            <span>Human Feedback & Model Learning Dataset</span>
          </h1>
          <p className="text-xs text-slate-400">Human-in-the-loop review entries queued for offline model evaluation and controlled retraining</p>
        </div>

        <button
          onClick={fetchFeedback}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Overview Banner */}
      <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Controlled Retraining Policy</div>
          <p className="text-xs text-slate-300 max-w-xl">
            To prevent adversarial poisoning attacks, feedback entries are stored in an isolated dataset. Models undergo validation testing prior to production deployment.
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-slate-400 block text-[10px] uppercase">Queued Records</span>
            <span className="text-cyan-400 text-lg">{feedbacks.length}</span>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-slate-400 block text-[10px] uppercase">Agreement Rate</span>
            <span className="text-emerald-400 text-lg">96.8%</span>
          </div>
        </div>
      </div>

      {/* Feedback Entries Table */}
      <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Recorded Feedback Queue</span>
        </h2>

        {feedbacks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No feedback submissions recorded yet. Submit feedback on any threat detail page to populate this dataset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Threat ID</th>
                  <th className="px-3 py-2">Original AI Label</th>
                  <th className="px-3 py-2">Original Risk</th>
                  <th className="px-3 py-2">Human Assigned Label</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {feedbacks.map(fb => (
                  <tr key={fb.id}>
                    <td className="px-3 py-2.5 text-slate-400">{new Date(fb.submittedAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-2.5 font-mono text-cyan-400">{fb.threatId}</td>
                    <td className="px-3 py-2.5">{fb.originalPrediction}</td>
                    <td className="px-3 py-2.5 font-bold">{fb.originalRiskScore}</td>
                    <td className="px-3 py-2.5 font-bold text-amber-300">{fb.userAssignedLabel}</td>
                    <td className="px-3 py-2.5">
                      {fb.isCorrect ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Agreed</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Correction</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
