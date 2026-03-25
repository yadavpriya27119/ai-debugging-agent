import { useState, useEffect } from 'react';
import { getStats, getHealth, getLearningStats } from '../services/api';
import { Bug, CheckCircle, XCircle, Loader, TrendingUp, Cpu, Brain, Zap } from 'lucide-react';

export default function Dashboard({ onSelectError }) {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [learning, setLearning] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes, learningRes] = await Promise.all([getStats(), getHealth(), getLearningStats()]);
        setStats(statsRes.data);
        setHealth(healthRes.data);
        setLearning(learningRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading"><Loader className="spin" size={32} /><p>Loading dashboard...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time overview of your AI debugging agent</p>
      </div>

      {/* Status Cards */}
      <div className="stats-grid">
        <StatCard icon={Bug} label="Total Errors" value={stats?.total || 0} color="blue" />
        <StatCard icon={CheckCircle} label="Fixed" value={stats?.fixed || 0} color="green" />
        <StatCard icon={XCircle} label="Failed" value={stats?.failed || 0} color="red" />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${stats?.successRate || 0}%`} color="purple" />
        <StatCard icon={Cpu} label="Avg Confidence" value={`${stats?.avgConfidence || 0}%`} color="orange" />
        <StatCard icon={Brain} label="Pattern Cache Hits" value={`${learning?.patternHitRate || 0}%`} color="green" />
      </div>

      {/* System Health */}
      <div className="card mt-4">
        <h3 className="card-title">System Health</h3>
        <div className="health-grid">
          <HealthItem label="Groq AI" ok={health?.groqConfigured} />
          <HealthItem label="GitHub" ok={health?.githubConfigured} />
          <HealthItem label="MongoDB" ok={health?.mongoConfigured} />
          <HealthItem label="Slack Notifications" ok={health?.slackConfigured} />
          <HealthItem label="Log Watcher" ok={health?.watchingLog !== 'not set'} extra={health?.watchingLog} />
          <HealthItem label="Auto-Merge" ok={true} extra={`Threshold: ${health?.autoMergeThreshold || 95}%`} />
        </div>
      </div>

      {/* Pattern Learning */}
      {learning && (
        <div className="card mt-4">
          <h3 className="card-title">Pattern Learning Stats</h3>
          <div className="learning-grid">
            <LearningItem label="Total Fixes Generated" value={learning.total} />
            <LearningItem label="From AI (Groq)" value={learning.fromAI} color="blue" />
            <LearningItem label="From Cache (free)" value={learning.fromPattern} color="green" />
            <LearningItem label="Merged / Confirmed" value={learning.merged} color="purple" />
          </div>
          {learning.total > 0 && (
            <div className="mt-3">
              <p className="label">Cache Hit Rate</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${learning.patternHitRate}%` }} />
              </div>
              <p className="muted small mt-1">{learning.patternHitRate}% of fixes served from cache — saving AI API calls</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Errors */}
      <div className="card mt-4">
        <h3 className="card-title">Recent Errors</h3>
        {!stats?.recentErrors?.length ? (
          <p className="muted">No errors detected yet. Try the Test Agent tab!</p>
        ) : (
          <div className="error-list">
            {stats.recentErrors.map((err) => (
              <div key={err._id} className="error-item" onClick={() => onSelectError(err._id)}>
                <div className="error-item-left">
                  <span className={`badge badge-${err.status}`}>{err.status}</span>
                  <span className="error-type">{err.errorType}</span>
                </div>
                <div className="error-item-right">
                  <span className="error-msg">{err.errorMessage?.substring(0, 80)}...</span>
                  <span className="error-time">{new Date(err.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon"><Icon size={24} /></div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

function LearningItem({ label, value, color = 'default' }) {
  return (
    <div className="learning-item">
      <p className="learning-value" style={{ color: color === 'blue' ? 'var(--accent-blue)' : color === 'green' ? 'var(--accent-green)' : color === 'purple' ? 'var(--accent-purple)' : 'var(--text-primary)' }}>{value}</p>
      <p className="learning-label">{label}</p>
    </div>
  );
}

function HealthItem({ label, ok, extra }) {
  return (
    <div className={`health-item ${ok ? 'health-ok' : 'health-fail'}`}>
      <span className="health-dot" />
      <div>
        <p className="health-label">{label}</p>
        {extra && <p className="health-extra">{extra}</p>}
      </div>
      <span className="health-status">{ok ? 'Connected' : 'Not Configured'}</span>
    </div>
  );
}
