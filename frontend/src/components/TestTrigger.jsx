import { useState } from 'react';
import { triggerTestError } from '../services/api';
import { FlaskConical, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const PRESETS = [
  {
    label: 'TypeError: undefined property',
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'email')",
    errorType: 'TypeError',
    stackTrace: "TypeError: Cannot read properties of undefined (reading 'email')\n    at routes/user.js:42:18\n    at Layer.handle [as handle_request]",
    filePath: null,
    lineNumber: null,
  },
  {
    label: 'ReferenceError: variable not defined',
    errorMessage: "ReferenceError: userDta is not defined",
    errorType: 'ReferenceError',
    stackTrace: "ReferenceError: userDta is not defined\n    at controllers/authController.js:28:5",
    filePath: null,
    lineNumber: null,
  },
  {
    label: 'ECONNREFUSED: DB connection failed',
    errorMessage: "Error: connect ECONNREFUSED 127.0.0.1:27017",
    errorType: 'Error',
    stackTrace: "Error: connect ECONNREFUSED 127.0.0.1:27017\n    at TCPConnectWrap.afterConnect",
    filePath: null,
    lineNumber: null,
  },
];

export default function TestTrigger() {
  const [form, setForm] = useState(PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePreset = (preset) => {
    setForm(preset);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await triggerTestError(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Test Agent</h2>
        <p>Manually trigger the pipeline to test your setup</p>
      </div>

      <div className="card">
        <h3 className="card-title">Quick Presets</h3>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`preset-btn ${form.label === p.label ? 'active' : ''}`}
              onClick={() => handlePreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="card-title">Custom Error</h3>
        <form onSubmit={handleSubmit} className="test-form">
          <div className="form-group">
            <label>Error Message</label>
            <input
              className="input"
              value={form.errorMessage}
              onChange={(e) => setForm({ ...form, errorMessage: e.target.value })}
              placeholder="TypeError: Cannot read..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Error Type</label>
              <input
                className="input"
                value={form.errorType}
                onChange={(e) => setForm({ ...form, errorType: e.target.value })}
                placeholder="TypeError"
              />
            </div>
            <div className="form-group">
              <label>File Path (optional)</label>
              <input
                className="input"
                value={form.filePath || ''}
                onChange={(e) => setForm({ ...form, filePath: e.target.value || null })}
                placeholder="routes/user.js"
              />
            </div>
            <div className="form-group">
              <label>Line Number (optional)</label>
              <input
                className="input"
                type="number"
                value={form.lineNumber || ''}
                onChange={(e) => setForm({ ...form, lineNumber: parseInt(e.target.value) || null })}
                placeholder="42"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Stack Trace (optional)</label>
            <textarea
              className="input textarea"
              value={form.stackTrace || ''}
              onChange={(e) => setForm({ ...form, stackTrace: e.target.value })}
              placeholder="TypeError: ...\n    at routes/user.js:42:18"
              rows={4}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Running Pipeline...</> : <><FlaskConical size={16} /> Trigger Pipeline</>}
          </button>
        </form>
      </div>

      {result && (
        <div className="card mt-4 result-card result-success">
          <CheckCircle size={20} className="green" />
          <div>
            <p className="result-title">Pipeline triggered successfully!</p>
            <p className="muted">Check the Dashboard and Errors tab for updates. The agent is processing in background.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card mt-4 result-card result-error">
          <AlertCircle size={20} className="red" />
          <div>
            <p className="result-title">Error: {error}</p>
            <p className="muted">Make sure the backend is running and your .env is configured.</p>
          </div>
        </div>
      )}
    </div>
  );
}
