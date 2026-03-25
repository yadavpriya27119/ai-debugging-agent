import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import ErrorList from './components/ErrorList';
import FixHistory from './components/FixHistory';
import ErrorDetail from './components/ErrorDetail';
import TestTrigger from './components/TestTrigger';
import SettingsPage from './components/SettingsPage';
import WebhooksPage from './components/WebhooksPage';
import { Bot, LayoutDashboard, Bug, Wrench, FlaskConical, Settings, Webhook, Wifi, WifiOff } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'errors', label: 'Errors', icon: Bug },
  { id: 'fixes', label: 'Fix History', icon: Wrench },
  { id: 'test', label: 'Test Agent', icon: FlaskConical },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const EVENT_LABELS = {
  error_detected: '🔴 Error detected',
  fix_generated: '🔵 Fix generated',
  pr_opened: '🟢 PR opened',
  pattern_match: '⚡ Cache hit',
  duplicate_error: '⚪ Duplicate skipped',
  pipeline_failed: '❌ Pipeline failed',
  pr_failed: '❌ PR failed',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [connected, setConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [selectedErrorId, setSelectedErrorId] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const addEvent = (type, data) => {
      setLiveEvents((prev) => [{ type, data, time: new Date() }, ...prev].slice(0, 50));
    };

    Object.keys(EVENT_LABELS).forEach((evt) => socket.on(evt, (d) => addEvent(evt, d)));

    return () => socket.removeAllListeners();
  }, []);

  const navigate = (tab, errorId = null) => {
    setSelectedErrorId(errorId);
    setActiveTab(tab);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Bot size={32} className="logo-icon" />
          <div>
            <h1>AI Debug Agent</h1>
            <p>Auto-fix Engine v2</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Live event feed */}
        <div className="live-feed">
          <div className="live-feed-header">
            {connected
              ? <Wifi size={14} className="green" />
              : <WifiOff size={14} className="red" />}
            <span>{connected ? 'Live' : 'Disconnected'}</span>
          </div>
          <div className="live-events">
            {liveEvents.length === 0 && (
              <p className="no-events">Waiting for events...</p>
            )}
            {liveEvents.map((evt, i) => (
              <div key={i} className={`live-event live-event-${evt.type}`}>
                <span className="evt-dot" />
                <div>
                  <span className="evt-text">{EVENT_LABELS[evt.type] || evt.type}</span>
                  <span className="evt-time"> {evt.time.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard onSelectError={(id) => navigate('errors', id)} />
        )}
        {activeTab === 'errors' && !selectedErrorId && (
          <ErrorList onSelect={(id) => setSelectedErrorId(id)} />
        )}
        {activeTab === 'errors' && selectedErrorId && (
          <ErrorDetail id={selectedErrorId} onBack={() => setSelectedErrorId(null)} />
        )}
        {activeTab === 'fixes' && <FixHistory />}
        {activeTab === 'test' && <TestTrigger />}
        {activeTab === 'webhooks' && <WebhooksPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
