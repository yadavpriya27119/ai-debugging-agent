import { useState, useEffect } from 'react';
import { getWebhookInfo, triggerTestError } from '../services/api';
import { Webhook, Copy, CheckCircle, Loader, ExternalLink, FlaskConical } from 'lucide-react';

export default function WebhooksPage() {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getWebhookInfo().then((res) => setInfo(res.data)).catch(console.error);
  }, []);

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied((c) => ({ ...c, [key]: true }));
    setTimeout(() => setCopied((c) => ({ ...c, [key]: false })), 2000);
  };

  const testGenericWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await triggerTestError({
        errorMessage: "TypeError: Cannot read properties of undefined (reading 'userId')",
        errorType: 'TypeError',
        stackTrace: "TypeError: Cannot read...\n    at routes/order.js:88:14",
        source: 'manual-webhook-test',
      });
      setTestResult({ success: true, message: 'Pipeline triggered! Check Dashboard for updates.' });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Webhooks</h2>
        <p>Connect external tools to automatically trigger the agent</p>
      </div>

      {/* Sentry */}
      <div className="card">
        <div className="webhook-header">
          <div className="webhook-icon sentry-icon">S</div>
          <div>
            <h3 className="card-title" style={{ marginBottom: 2 }}>Sentry Integration</h3>
            <p className="muted small">Auto-trigger fixes from real production errors in Sentry</p>
          </div>
        </div>

        <div className="webhook-url-block mt-3">
          <label className="label">Webhook URL</label>
          <div className="copy-row">
            <code className="url-code">{info?.sentry?.url || 'Loading...'}</code>
            <button className="btn btn-secondary btn-sm" onClick={() => copy('sentry', info?.sentry?.url)}>
              {copied.sentry ? <CheckCircle size={14} className="green" /> : <Copy size={14} />}
              {copied.sentry ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="setup-steps mt-3">
          <p className="label">Setup Steps</p>
          <ol className="steps-list">
            <li>Go to your Sentry project → <strong>Settings</strong> → <strong>Integrations</strong></li>
            <li>Search for <strong>"Webhooks"</strong> → click <strong>Configure</strong></li>
            <li>Paste the URL above into <strong>"Callback URLs"</strong></li>
            <li>Under <strong>"Enabled Events"</strong>, check <strong>"issue"</strong></li>
            <li>Click <strong>Save Changes</strong></li>
          </ol>
        </div>

        <div className="webhook-result mt-3">
          <p className="label">What happens</p>
          <p className="muted small">Every time Sentry detects a new error in your production app → Agent auto-triggers → AI analyzes → PR opened in your GitHub repo.</p>
        </div>
      </div>

      {/* Generic Webhook */}
      <div className="card mt-4">
        <div className="webhook-header">
          <div className="webhook-icon generic-icon"><Webhook size={18} /></div>
          <div>
            <h3 className="card-title" style={{ marginBottom: 2 }}>Generic Webhook</h3>
            <p className="muted small">Connect from Datadog, CloudWatch, Grafana, or any custom tool</p>
          </div>
        </div>

        <div className="webhook-url-block mt-3">
          <label className="label">Webhook URL</label>
          <div className="copy-row">
            <code className="url-code">{info?.generic?.url || 'Loading...'}</code>
            <button className="btn btn-secondary btn-sm" onClick={() => copy('generic', info?.generic?.url)}>
              {copied.generic ? <CheckCircle size={14} className="green" /> : <Copy size={14} />}
              {copied.generic ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <p className="label">Request Body (POST JSON)</p>
          <div className="copy-row">
            <pre className="code-block" style={{ flex: 1 }}>{JSON.stringify(info?.generic?.body || {}, null, 2)}</pre>
            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => copy('body', JSON.stringify({ errorMessage: "TypeError: x is null", errorType: "TypeError", stackTrace: "...", filePath: "routes/user.js", lineNumber: 42, source: "datadog" }, null, 2))}
            >
              {copied.body ? <CheckCircle size={14} className="green" /> : <Copy size={14} />}
              Copy Example
            </button>
          </div>
        </div>

        <div className="mt-3">
          <p className="label">Example curl command</p>
          <div className="copy-row">
            <pre className="code-block" style={{ flex: 1, fontSize: 11 }}>
{`curl -X POST ${info?.generic?.url || 'http://localhost:5000/api/webhooks/generic'} \\
  -H "Content-Type: application/json" \\
  -d '{"errorMessage":"TypeError: x is null","errorType":"TypeError","source":"curl-test"}'`}
            </pre>
            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => copy('curl', `curl -X POST ${info?.generic?.url} -H "Content-Type: application/json" -d '{"errorMessage":"TypeError: x is null","errorType":"TypeError","source":"curl-test"}'`)}
            >
              {copied.curl ? <CheckCircle size={14} className="green" /> : <Copy size={14} />}
              Copy
            </button>
          </div>
        </div>

        {/* Test Button */}
        <div className="mt-4">
          <button className="btn btn-primary" onClick={testGenericWebhook} disabled={testing}>
            {testing ? <><Loader size={16} className="spin" /> Testing...</> : <><FlaskConical size={16} /> Test Webhook Now</>}
          </button>
          {testResult && (
            <span className={`ml-3 ${testResult.success ? 'green' : 'red'}`} style={{ fontSize: 13, marginLeft: 12 }}>
              {testResult.success ? <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} /> : '❌ '}
              {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Supported Tools */}
      <div className="card mt-4">
        <h3 className="card-title">Supported Tools</h3>
        <div className="tools-grid">
          {TOOLS.map((t) => (
            <div key={t.name} className="tool-item">
              <span className="tool-badge">{t.name}</span>
              <span className="tool-type muted small">{t.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TOOLS = [
  { name: 'Sentry', type: 'Native webhook' },
  { name: 'Datadog', type: 'Generic webhook' },
  { name: 'AWS CloudWatch', type: 'Generic webhook' },
  { name: 'Grafana', type: 'Generic webhook' },
  { name: 'PagerDuty', type: 'Generic webhook' },
  { name: 'Log files', type: 'Log watcher' },
  { name: 'Custom scripts', type: 'Generic webhook' },
  { name: 'GitHub Actions', type: 'Generic webhook' },
];
