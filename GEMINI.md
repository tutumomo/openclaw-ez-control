# OpenClaw EZ-Control Project Overview

OpenClaw EZ-Control is a comprehensive management dashboard and control panel for the **OpenClaw** agent framework. It provides a user-friendly web interface to configure agents, manage LLM models, monitor system status, and handle advanced features like memory settings and plugin wizards.

## Architecture

- **Backend:** Python (FastAPI) located in the `backend/` directory.
  - `main.py`: Entry point for the API server.
  - `openclaw_config_manager.py`: Core logic for reading, validating, and saving OpenClaw configurations. It interacts with the `openclaw` CLI and manages backups.
  - `gateway_connection.py`: Manages the connection to the OpenClaw gateway.
- **Frontend:** React + TypeScript + Vite located in the `frontend/` directory.
  - Uses Tailwind CSS for styling and Lucide React for icons.
  - `src/api.ts`: Centralized API client using Axios for communicating with the backend.
  - `src/components/`: Modular UI components for different sections (Dashboard, Agents, LLMs, Skills, etc.).

## Key Features

- **Agent Management:** Create, clone, update, and delete agents. Edit agent-specific markdown files.
- **Model Center:** Configure global and agent-specific LLM models, including fallbacks and vision models.
- **Memory Settings Center:** Manage LanceDB and other memory-related configurations.
- **Plugin Wizard:** Streamlined installation and configuration of OpenClaw plugins.
- **Skills Center:** Manage, toggle, and update agent skills via Git.
- **Channels Center:** Configure communication channels like Telegram.
- **System Monitoring:** View logs and monitor the health of the OpenClaw gateway.
- **Backup & Rollback:** Automatic configuration backups with the ability to rollback to previous states.

## Tech Stack

- **Backend:** FastAPI, Uvicorn, Pydantic, Python 3.10+.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Axios.
- **Storage:** Interacts with `~/.openclaw/openclaw.json` and a SQLite database for some local management data.

## Development & Usage

### Prerequisites
- Node.js & npm
- Python 3.10+
- `openclaw` CLI installed and accessible.

### Running in Stable Mode (Recommended)
This mode serves the frontend via the FastAPI backend.
1. **Build Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. **Start Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8002
   ```
3. **Access:** `http://localhost:8002`

### Running in Dev Mode
For active frontend development with Hot Module Replacement (HMR).
1. **Start Backend:** (Terminal 1)
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```
2. **Start Frontend:** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
3. **Access:** `http://localhost:5173` (Vite dev server)

### Quick Start Scripts
- `start_mac_linux.sh`: Automation script for Unix-like systems.
- `start_windows.bat`: Batch script for Windows systems.

## Configuration
- The default OpenClaw config path is `~/.openclaw/openclaw.json`.
- The backend port defaults to `8002`.
- Frontend assets are served from `frontend/dist` when the backend is running in production mode.

## Development Conventions

- **API Routes:** All backend API routes should be prefixed with `/api`.
- **Typing:** Strict TypeScript typing is used in the frontend (`frontend/src/types.ts`).
- **Safety:** Configuration changes are validated using `openclaw config validate` before being saved, and backups are created automatically.
