# ProjectPulse

A GitHub repository health dashboard designed for hackathon teams. Connect any public GitHub repo URL and get an intelligent health summary, activity insights, and blocker detection.

## Features

- **Repository Health Overview**: Get a comprehensive view of any public GitHub repository
- **Activity Heatmap**: Visualize commit activity over the last 7 days
- **Branch Analysis**: See all branches with stale branch detection
- **Pull Request Tracking**: Monitor open PRs and their status
- **Issue Overview**: Track open issues with labels
- **Contributor Activity**: See who's been active recently

## Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, React Query, Recharts
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (coming soon)
- **Data Source**: GitHub REST API
- **Caching**: In-memory cache with 5-minute TTL

## Project Structure

```
projectpulse/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page-level views
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
├── server/                  # Node.js + Express backend
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic (GitHub, Claude, cache)
│   ├── utils/               # Shared utilities
│   └── index.js             # Entry point
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- GitHub Personal Access Token (optional, but recommended for higher rate limits)

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd projectpulse
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Set up environment variables:
   ```bash
   cd ../server
   cp ../.env.example .env
   # Edit .env with your tokens
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pulse` | Fetch repository health data |
| POST | `/api/chat` | Chat with AI about the repo (coming soon) |
| GET | `/api/health` | Health check endpoint |

#### POST /api/pulse

Request body:
```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

Response:
```json
{
  "meta": {
    "name": "repo",
    "description": "...",
    "owner": "owner",
    "defaultBranch": "main",
    "language": "JavaScript",
    "stars": 1000
  },
  "commits": [...],
  "branches": [...],
  "pullRequests": [...],
  "issues": [...],
  "contributors": [...],
  "fetchedAt": "2024-01-15T12:00:00.000Z",
  "cached": false
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Recommended |
| `ANTHROPIC_API_KEY` | Anthropic API Key | For AI features |
| `PORT` | Server port (default: 3001) | No |
| `CLIENT_URL` | Client URL for CORS (default: http://localhost:5173) | No |

## Deployment

The project is structured for independent deployment:

- **Frontend**: Deploy to Vercel, Netlify, or any static hosting
- **Backend**: Deploy to Railway, Render, Heroku, or any Node.js hosting

### Frontend Deployment (Vercel)

1. Connect your repository to Vercel
2. Set the root directory to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL` pointing to your backend URL

### Backend Deployment (Railway)

1. Connect your repository to Railway
2. Set the root directory to `server`
3. Add environment variables from `.env.example`

## License

MIT
