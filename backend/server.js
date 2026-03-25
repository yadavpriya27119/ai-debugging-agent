require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const LogWatcher = require('./components/logWatcher');
const { runPipeline } = require('./components/pipeline');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time dashboard updates
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Routes
app.use('/api/errors', require('./routes/errors'));
app.use('/api/fixes', require('./routes/fixes'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    watchingLog: process.env.WATCH_LOG_PATH || 'not set',
    groqConfigured: !!process.env.GROQ_API_KEY,
    githubConfigured: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER),
    mongoConfigured: !!process.env.MONGODB_URI,
    slackConfigured: !!process.env.SLACK_WEBHOOK_URL,
    sentryWebhookUrl: '/api/webhooks/sentry',
    genericWebhookUrl: '/api/webhooks/generic',
    autoMergeThreshold: process.env.AUTO_MERGE_THRESHOLD || '95',
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket] Client disconnected: ${socket.id}`));
});

// Start server and connect DB
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 AI Debugging Agent Backend running on http://localhost:${PORT}`);
    console.log(`📋 API docs: http://localhost:${PORT}/api/health\n`);
  });

  // Start Log Watcher if configured
  const logPath = process.env.WATCH_LOG_PATH;
  if (logPath) {
    const watcher = new LogWatcher(logPath);
    watcher.start();

    watcher.on('error_detected', (errorEvent) => {
      console.log('[Server] Error detected, running pipeline...');
      runPipeline(errorEvent, io).catch(console.error);
    });
  } else {
    console.warn('[Server] WATCH_LOG_PATH not set — log watcher not started.');
    console.warn('[Server] Use POST /api/errors/test to manually trigger the pipeline.');
  }
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
