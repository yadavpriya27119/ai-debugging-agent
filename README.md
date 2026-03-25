# 🤖 AI Software Debugging Agent
### MERN Stack | 100% Free to Run

An AI agent that watches your running application, detects errors, generates fixes using **Groq AI (Free)**, and opens GitHub Pull Requests — automatically.

---

## Architecture (5 Core Components)

```
Log File → [LogWatcher] → [CodebaseReader] → [AIBrain] → [FixGenerator] → [GitHub PR]
                              (Groq Llama 3 - Free)
```

---

## Free API Keys You Need

### 1. Groq API Key (FREE — No credit card needed)
> Powers the AI brain using Llama 3.3-70B model

1. Go to **https://console.groq.com**
2. Sign up with Google/GitHub
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

### 2. MongoDB Atlas (FREE — 512MB forever)
> Stores all errors and fixes

1. Go to **https://cloud.mongodb.com**
2. Sign up → Create free cluster (M0 tier)
3. Create a database user (username + password)
4. Click **Connect** → **Drivers** → Copy the connection string
5. Replace `<password>` with your password

### 3. GitHub Personal Access Token (FREE)
> Creates branches and Pull Requests automatically

1. Go to **GitHub** → Settings → **Developer settings**
2. Personal access tokens → **Tokens (classic)**
3. Click **Generate new token (classic)**
4. Select scope: `repo` (full control)
5. Copy the token (starts with `ghp_...`)

---

## Setup & Run

### Step 1 — Clone and configure
```bash
cd ai-debugging-agent/backend
cp .env.example .env
# Edit .env with your keys
```

### Step 2 — Fill in your `.env`
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ai-debugger
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
PORT=5000
WATCH_LOG_PATH=./logs/app.log
```

### Step 3 — Start Backend
```bash
cd backend
npm install
npm run dev
```

### Step 4 — Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Step 5 — Open Dashboard
- Frontend: **http://localhost:5173**
- API: **http://localhost:5000/api/health**

---

## Test Without a Real App

Use the **Test Agent** tab in the dashboard to manually trigger the pipeline with preset errors.

Or via curl:
```bash
curl -X POST http://localhost:5000/api/errors/test \
  -H "Content-Type: application/json" \
  -d '{"errorMessage": "TypeError: Cannot read properties of undefined", "errorType": "TypeError"}'
```

---

## Monitor a Real App

Point `WATCH_LOG_PATH` to your app's log file:
```env
WATCH_LOG_PATH=C:/path/to/your/app/logs/error.log
WATCH_SOURCE_PATH=C:/path/to/your/app/src
```

Any time your app writes an error to that log file, the agent will:
1. Detect it in real time
2. Read the broken code
3. Ask Groq AI for a fix
4. Open a GitHub PR with the fix

---

## Folder Structure

```
ai-debugging-agent/
├── backend/
│   ├── server.js              # Express + Socket.io server
│   ├── .env.example           # Environment variables template
│   ├── components/
│   │   ├── logWatcher.js      # Component 1: Watches log files
│   │   ├── codebaseReader.js  # Component 2: Reads broken code
│   │   ├── aiBrain.js         # Component 3: Groq AI analysis
│   │   ├── fixGenerator.js    # Component 4: Writes & validates fix
│   │   ├── githubIntegration.js # Component 5: Opens PR
│   │   └── pipeline.js        # Connects all 5 components
│   ├── models/
│   │   ├── ErrorLog.js        # MongoDB error schema
│   │   └── Fix.js             # MongoDB fix schema
│   ├── routes/
│   │   ├── errors.js          # Error API endpoints
│   │   └── fixes.js           # Fix API endpoints
│   └── config/
│       └── db.js              # MongoDB connection
└── frontend/
    └── src/
        ├── App.jsx            # Main app with sidebar + routing
        ├── components/
        │   ├── Dashboard.jsx  # Stats + health + recent errors
        │   ├── ErrorList.jsx  # Paginated error table
        │   ├── ErrorDetail.jsx # Error + fix detail view
        │   ├── FixHistory.jsx # All generated fixes
        │   └── TestTrigger.jsx # Manual test interface
        └── services/
            └── api.js         # Axios API calls
```

---

## Cost Breakdown (All Free)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Groq API | ✅ Free | 14,400 req/day |
| MongoDB Atlas | ✅ Free | 512MB storage |
| GitHub API | ✅ Free | 5,000 req/hour |
| Node.js + React | ✅ Free | Unlimited |

**Total monthly cost: $0**
