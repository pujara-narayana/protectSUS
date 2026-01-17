# ProtectSUS Setup Guide

Complete setup guide for ProtectSUS - AI-Powered Code Security Analysis Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub App Setup](#github-app-setup)
3. [Database Configuration](#database-configuration)
4. [API Keys](#api-keys)
5. [Local Development](#local-development)
6. [Docker Deployment](#docker-deployment)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Python 3.11+** installed
- **Docker Desktop** (for containerized deployment)
- **Git** for version control
- Accounts on:
  - MongoDB Atlas (free tier available)
  - Neo4j AuraDB (free tier available)
  - Anthropic (Claude API access)
  - Token Company (API access)
  - GitHub (for creating GitHub App)

## GitHub App Setup

### 1. Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps → New GitHub App
2. Fill in the details:
   - **GitHub App name**: `ProtectSUS-YourOrg`
   - **Homepage URL**: `https://your-domain.com`
   - **Webhook URL**: `https://your-domain.com/api/v1/webhooks/github`
   - **Webhook secret**: Generate a random string (save for later)

3. Set permissions:
   - **Repository permissions**:
     - Contents: Read & write
     - Pull requests: Read & write
     - Webhooks: Read-only
   - **Subscribe to events**:
     - Push
     - Pull request

4. Click "Create GitHub App"

### 2. Generate Private Key

1. After creating the app, scroll down to "Private keys"
2. Click "Generate a private key"
3. Download the `.pem` file
4. Move it to your project root: `./github-app-private-key.pem`

### 3. Install the App

1. Go to your GitHub App settings
2. Click "Install App"
3. Select the repositories you want to analyze
4. Note the **App ID** from the app settings page

## Database Configuration

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP address (or use 0.0.0.0/0 for development)
4. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/
   ```

### Neo4j AuraDB

1. Create a free instance at [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura/)
2. Save the credentials (username, password, URI)
3. Your connection URI will look like:
   ```
   neo4j+s://xxxxx.databases.neo4j.io
   ```

## API Keys

### LLM Provider (Choose One)

ProtectSUS supports multiple LLM providers. Choose the one that best fits your needs:

#### Option 1: Anthropic Claude (Recommended)
1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to API Keys
3. Generate a new API key
4. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-xxxxx`
5. Set: `LLM_PROVIDER=anthropic`

#### Option 2: OpenAI GPT
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Go to API Keys section
3. Create a new API key
4. Add to `.env`: `OPENAI_API_KEY=sk-xxxxx`
5. Set: `LLM_PROVIDER=openai`

#### Option 3: Google Gemini (Free Tier Available)
1. Visit [makersuite.google.com](https://makersuite.google.com/app/apikey)
2. Generate an API key
3. Add to `.env`: `GOOGLE_API_KEY=xxxxx`
4. Set: `LLM_PROVIDER=gemini`

#### Option 4: OpenRouter (Multiple Models)
1. Sign up at [openrouter.ai](https://openrouter.ai/)
2. Go to Keys section
3. Create API key
4. Add to `.env`: `OPENROUTER_API_KEY=sk-or-xxxxx`
5. Set: `LLM_PROVIDER=openrouter`

**See `LLM_PROVIDERS.md` for detailed comparison and configuration guide.**

### Token Company API

1. Sign up at Token Company (or use fallback compression)
2. Generate API key
3. Note: If you don't have Token Company access, the system will use fallback compression

## Local Development

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/protectsus.git
cd protectsus

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

Required environment variables:
```env
# Application
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here

# LLM Provider (choose one and set corresponding API key)
LLM_PROVIDER=anthropic  # or openai, gemini, openrouter

# LLM API Keys (set the one matching your LLM_PROVIDER)
ANTHROPIC_API_KEY=sk-ant-xxxxx  # If using Anthropic
OPENAI_API_KEY=sk-xxxxx         # If using OpenAI
GOOGLE_API_KEY=xxxxx            # If using Gemini
OPENROUTER_API_KEY=sk-or-xxxxx  # If using OpenRouter

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=protectsus

# Neo4j
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Redis
REDIS_URL=redis://localhost:6379/0

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_PATH=./github-app-private-key.pem
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Token Company (optional)
TOKEN_COMPANY_API_KEY=your-api-key
```

### 3. Setup Databases

```bash
# Run database setup script
python scripts/setup_databases.py
```

### 4. Start Services

```bash
# Terminal 1: Start Redis (if not using Docker)
redis-server

# Terminal 2: Start FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info
```

### 5. Verify Setup

Visit http://localhost:8000/docs to see the API documentation.

Test the health endpoint:
```bash
curl http://localhost:8000/health
```

## Docker Deployment

### Quick Start

```bash
# Make sure .env is configured
cp .env.example .env
# Edit .env with your credentials

# Run the startup script
./run.sh

# Or manually
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f celery-worker
```

### Scale Workers

```bash
docker-compose up -d --scale celery-worker=4
```

## Testing

### Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Unit tests only
pytest tests/unit/

# Specific test file
pytest tests/unit/test_agents.py
```

### Manual Testing

1. **Trigger analysis via webhook** (use ngrok for local testing):
   ```bash
   # Install ngrok
   brew install ngrok  # macOS

   # Expose local port
   ngrok http 8000

   # Update GitHub App webhook URL to ngrok URL
   ```

2. **Test analysis endpoint**:
   ```bash
   curl http://localhost:8000/api/v1/analysis/{analysis_id}
   ```

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```
Error: Could not connect to MongoDB
```
Solution:
- Check your MongoDB URI in .env
- Verify IP whitelist in MongoDB Atlas
- Ensure network connectivity

**2. GitHub Webhook Fails**
```
Error: Invalid signature
```
Solution:
- Verify GITHUB_WEBHOOK_SECRET matches GitHub App settings
- Check webhook URL is accessible (use ngrok for local development)

**3. Celery Tasks Not Running**
```
Warning: No Celery workers available
```
Solution:
- Start Celery worker: `celery -A app.tasks.celery_app worker --loglevel=info`
- Verify Redis is running
- Check CELERY_BROKER_URL in .env

**4. Agent Analysis Fails**
```
Error: Anthropic API key invalid
```
Solution:
- Verify ANTHROPIC_API_KEY in .env
- Check API key hasn't expired
- Ensure sufficient API credits

**5. Docker Issues**
```
Error: Cannot connect to Docker daemon
```
Solution:
- Start Docker Desktop
- Verify Docker is running: `docker info`

### Getting Help

- Check logs: `docker-compose logs -f`
- Review API docs: http://localhost:8000/docs
- Open an issue on GitHub

## Next Steps

After setup:

1. **Configure GitHub Webhooks**: Point your GitHub App to your deployment URL
2. **Test Analysis**: Push code to a repository with the app installed
3. **Monitor Results**: Check the API and database for analysis results
4. **Customize Agents**: Modify agent prompts in `app/services/agents/`
5. **Add Tests**: Extend test coverage in `tests/`

## Production Deployment

For production deployment:

1. **Use environment-specific .env files**
2. **Set DEBUG=False**
3. **Use strong SECRET_KEY**
4. **Configure SSL/TLS** (Let's Encrypt recommended)
5. **Set up monitoring** (Arize Phoenix, DataDog, etc.)
6. **Enable rate limiting**
7. **Configure backup strategy** for databases
8. **Use production-grade web server** (already using Nginx in docker-compose)

---

For detailed deployment guides, see the PRD or contact support.
