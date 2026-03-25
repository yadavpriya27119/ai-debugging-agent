import { useState, useEffect } from 'react';
import { getErrorById } from '../services/api';
import { ArrowLeft, ExternalLink, Loader, CheckCircle, XCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ErrorDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getErrorById(id)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><Loader className="spin" size={32} /></div>;
  if (!data) return <div className="page"><p>Error not found.</p></div>;

  const { error, fix } = data;

  return (
    <div className="page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Errors
      </button>

      <div className="page-header">
        <h2>{error.errorType}</h2>
        <span className={`badge badge-${error.status}`}>{error.status}</span>
      </div>

      {/* Error Info */}
      <div className="card">
        <h3 className="card-title">Error Details</h3>
        <div className="detail-grid">
          <Detail label="Message" value={error.errorMessage} />
          <Detail label="File" value={`${error.filePath || 'Unknown'}:${error.lineNumber || '?'}`} />
          <Detail label="Detected" value={new Date(error.createdAt).toLocaleString()} />
          <Detail label="Occurrences" value={error.occurrenceCount} />
        </div>

        {error.stackTrace && (
          <div className="mt-3">
            <p className="label">Stack Trace</p>
            <pre className="code-block">{error.stackTrace}</pre>
          </div>
        )}
      </div>

      {/* Fix */}
      {fix ? (
        <div className="card mt-4">
          <div className="fix-header">
            <h3 className="card-title">AI Fix</h3>
            <div className="fix-meta">
              <span className={`confidence confidence-${getConfidenceLevel(fix.confidenceScore)}`}>
                {fix.confidenceScore}% confidence
              </span>
              {fix.githubPrUrl && (
                <a href={fix.githubPrUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  <ExternalLink size={14} /> View PR #{fix.githubPrNumber}
                </a>
              )}
            </div>
          </div>

          <div className="mt-3">
            <p className="label">AI Explanation</p>
            <p className="explanation">{fix.aiExplanation}</p>
          </div>

          {fix.fixedCode && (
            <div className="mt-3">
              <p className="label">Fixed Code</p>
              <SyntaxHighlighter language="javascript" style={vscDarkPlus} className="syntax-block">
                {fix.fixedCode}
              </SyntaxHighlighter>
            </div>
          )}

          {fix.diffOutput && (
            <div className="mt-3">
              <p className="label">Code Diff</p>
              <SyntaxHighlighter language="diff" style={vscDarkPlus} className="syntax-block">
                {fix.diffOutput.substring(0, 3000)}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      ) : (
        <div className="card mt-4">
          <p className="muted">No fix generated yet for this error.</p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}

function getConfidenceLevel(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
