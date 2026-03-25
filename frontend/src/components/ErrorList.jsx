import { useState, useEffect } from 'react';
import { getErrors } from '../services/api';
import { Bug, ChevronRight, Loader } from 'lucide-react';

export default function ErrorList({ onSelect }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getErrors(page)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="loading"><Loader className="spin" size={32} /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Error Log</h2>
        <p>{data?.total || 0} total errors detected</p>
      </div>

      <div className="card">
        {!data?.errors?.length ? (
          <div className="empty-state">
            <Bug size={48} className="muted" />
            <p>No errors detected yet.</p>
            <p className="muted">Start your app or use the Test Agent tab.</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.errors.map((err) => (
                  <tr key={err._id} className="table-row" onClick={() => onSelect(err._id)}>
                    <td><span className="tag">{err.errorType}</span></td>
                    <td className="td-msg">{err.errorMessage?.substring(0, 60)}...</td>
                    <td className="td-file">{err.filePath ? err.filePath.split('/').pop() : '—'}:{err.lineNumber || '?'}</td>
                    <td><span className={`badge badge-${err.status}`}>{err.status}</span></td>
                    <td className="td-time">{new Date(err.createdAt).toLocaleString()}</td>
                    <td><ChevronRight size={16} className="muted" /></td>
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
