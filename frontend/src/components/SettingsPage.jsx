import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../services/api';
import { Settings, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [showSlackUrl, setShowSlackUrl] = useState(false);

  useEffect(() => {
    getSettings()
      .then((res) => {
        setSettings(res.data);
        const flat = {};
        Object.entries(res.data).forEach(([k, v]) => { flat[k] = v.value; });
        setForm(flat);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) return <div className="loading"><Loader className="spin" size={32} /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure all agent features from here — no need to edit .env manually</p>
      </div>

      <form onSubmit={handleSave}>

        {/* GitHub */}
        <div className="card">
          <h3 className="card-title">GitHub Integration</h3>
          <p className="settings-desc">Control which repo receives auto-fix Pull Requests.</p>
          <div className="form-row mt-3">
            <div className="form-group">
              <label>GitHub Owner (username)</label>
              <input className="input" value={form.github_owner || ''} onChange={(e) => set('github_owner', e.target.value)} placeholder="yadavpriya27119" />
            </div>
            <div className="form-group">
              <label>GitHub Repo Name</label>
              <input className="input" value={form.github_repo || ''} onChange={(e) => set('github_repo', e.target.value)} placeholder="E-commerce" />
            </div>
          </div>
        </div>

        {/* Auto-Merge */}
        <div className="card mt-4">
          <h3 className="card-title">Auto-Merge</h3>
          <p className="settings-desc">Automatically merge PRs when AI confidence is high enough.</p>

          <div className="toggle-row mt-3">
            <div>
              <p className="toggle-label">Enable Auto-Merge</p>
              <p className="toggle-sub">PRs above the threshold will be merged without human review</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={!!form.auto_merge_enabled} onChange={(e) => set('auto_merge_enabled', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-group mt-3">
            <label>Confidence Threshold: <strong>{form.auto_merge_threshold || 95}%</strong></label>
            <input
              type="range" min="50" max="100" step="5"
              className="slider"
              value={form.auto_merge_threshold || 95}
              onChange={(e) => set('auto_merge_threshold', parseInt(e.target.value))}
              disabled={!form.auto_merge_enabled}
            />
            <div className="slider-labels">
              <span>50% (risky)</span>
              <span>75%</span>
              <span>95% (safe)</span>
              <span>100% (off)</span>
            </div>
          </div>

          <div className="threshold-info mt-3">
            <div className={`threshold-box ${form.auto_merge_enabled && form.auto_merge_threshold >= 90 ? 'safe' : form.auto_merge_enabled ? 'warn' : 'off'}`}>
              {!form.auto_merge_enabled && <p>Auto-merge is <strong>disabled</strong>. All PRs require manual review.</p>}
              {form.auto_merge_enabled && form.auto_merge_threshold >= 90 && <p>🟢 Safe — only very high-confidence fixes are auto-merged.</p>}
              {form.auto_merge_enabled && form.auto_merge_threshold < 90 && <p>⚠️ Caution — lower threshold means more aggressive auto-merging.</p>}
            </div>
          </div>
        </div>

        {/* Slack */}
        <div className="card mt-4">
          <h3 className="card-title">Slack Notifications</h3>
          <p className="settings-desc">Get notified in Slack when errors are detected and PRs are opened.</p>

          <div className="toggle-row mt-3">
            <div>
              <p className="toggle-label">Enable Slack Notifications</p>
              <p className="toggle-sub">Sends messages to your Slack channel automatically</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={!!form.slack_enabled} onChange={(e) => set('slack_enabled', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-group mt-3">
            <label>Slack Webhook URL</label>
            <div className="input-with-icon">
              <input
                className="input"
                type={showSlackUrl ? 'text' : 'password'}
                value={form.slack_webhook_url || ''}
                onChange={(e) => set('slack_webhook_url', e.target.value)}
                placeholder="https://hooks.slack.com/services/xxx/yyy/zzz"
                disabled={!form.slack_enabled}
              />
              <button type="button" className="input-icon-btn" onClick={() => setShowSlackUrl(!showSlackUrl)}>
                {showSlackUrl ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="field-hint">Get from: api.slack.com/apps → Create App → Incoming Webhooks</p>
          </div>
        </div>

        {/* AI / Pattern Learning */}
        <div className="card mt-4">
          <h3 className="card-title">AI & Pattern Learning</h3>
          <p className="settings-desc">Control how the AI brain behaves and when to reuse past fixes.</p>

          <div className="toggle-row mt-3">
            <div>
              <p className="toggle-label">Enable Pattern Learning</p>
              <p className="toggle-sub">Reuse proven past fixes instead of calling AI every time (faster + free)</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={!!form.pattern_learning_enabled} onChange={(e) => set('pattern_learning_enabled', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-group mt-3">
            <label>Minimum Confidence to Open PR: <strong>{form.min_confidence_to_pr || 40}%</strong></label>
            <input
              type="range" min="10" max="90" step="5"
              className="slider"
              value={form.min_confidence_to_pr || 40}
              onChange={(e) => set('min_confidence_to_pr', parseInt(e.target.value))}
            />
            <div className="slider-labels">
              <span>10% (open all)</span>
              <span>50%</span>
              <span>90% (strict)</span>
            </div>
          </div>
        </div>

        {/* Monitoring */}
        <div className="card mt-4">
          <h3 className="card-title">Log Monitoring</h3>
          <p className="settings-desc">Path to the log file of the app you want to monitor.</p>
          <div className="form-group mt-3">
            <label>Log File Path</label>
            <input className="input" value={form.watch_log_path || ''} onChange={(e) => set('watch_log_path', e.target.value)} placeholder="C:/path/to/your/app/logs/error.log" />
            <p className="field-hint">Restart the backend after changing this for it to take effect.</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="save-row mt-4">
          {saved && (
            <div className="save-success">
              <CheckCircle size={16} className="green" /> Settings saved successfully!
            </div>
          )}
          {error && (
            <div className="save-error">
              <AlertCircle size={16} className="red" /> {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><Loader size={16} className="spin" /> Saving...</> : <><Settings size={16} /> Save All Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
}
