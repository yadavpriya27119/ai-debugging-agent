import { useState, useEffect } from 'react';
import { getFixes } from '../services/api';
import { ExternalLink, Loader, Wrench } from 'lucide-react';

export default function FixHistory() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFixes(page)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="loading"><Loader className="spin" size={32} /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Fix History</h2>
        <p>{data?.total || 0} fixes generated</p>
      </div>

      <div className="card">
        {!data?.fixes?.length ? (
          <div className="empty-state">
            <Wrench size={48} className="muted" />
            <p>No fixes generated yet.</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Error</th>
                  <th>AI Model</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>PR</th>
                  <th>Generated</th>
                </tr>
              </thead>
              <tbody>
                {data.fixes.map((fix) => (
                  <tr key={fix._id} className="table-row">
                    <td className="td-msg">
                      {fix.errorLogId?.errorType || '—'}<br />
                      <span className="muted small">{fix.errorLogId?.filePath?.split('/').pop() || ''}</span>
                    </td>
                    <td><span className="tag small">{fix.aiModel}</span></td>
                    <td>
                      <span className={`confidence confidence-${getLevel(fix.confidenceScore)}`}>
                        {fix.confidenceScore}%
                      </span>
                    </td>
                    <td><span className={`badge badge-${fix.status}`}>{fix.status}</span></td>
                    <td>
                      {fix.githubPrUrl ? (
                        <a href={fix.githubPrUrl} target="_blank" rel="noreferrer" className="pr-link">
                          <ExternalLink size={14} /> #{fix.githubPrNumber}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="td-time">{new Date(fix.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary">Previous</button>
              <span>Page {page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary">Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getLevel(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
