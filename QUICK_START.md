# ProtectSUS - Quick Start Guide

**Get up and running in 5 minutes!**

## Prerequisites Checklist

- [ ] Python 3.11+ installed
- [ ] Docker Desktop installed and running
- [ ] MongoDB Atlas account (free tier)
- [ ] Neo4j AuraDB account (free tier)
- [ ] Anthropic API key
- [ ] GitHub account for creating GitHub App

## 3-Step Setup

### Step 1: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your credentials
# Minimum required:
# - ANTHROPIC_API_KEY
# - MONGODB_URI
# - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
# - GITHUB_APP_ID, GITHUB_WEBHOOK_SECRET
# - SECRET_KEY (generate random string)
```

### Step 2: Add GitHub App Key (1 minute)

```bash
# Place your GitHub App private key in project root
cp /path/to/your-github-app-private-key.pem ./github-app-private-key.pem
```

### Step 3: Start Services (2 minutes)

```bash
# Quick start with Docker
./run.sh

# Or manually
docker-compose up -d
```

## Verify Installation

```bash
# Check API health
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","environment":"production"}
```

## Access Points

- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Test Your Setup

### Option 1: Manual Test via API Docs

1. Visit http://localhost:8000/docs
2. Try the `/health` endpoint
3. Explore the API documentation

### Option 2: Trigger Analysis via GitHub

1. Install your GitHub App on a repository
2. Push code to the repository
3. Check webhook delivery in GitHub App settings
4. Query analysis status via API

### Option 3: Use curl

```bash
# Check webhook endpoint
curl http://localhost:8000/api/v1/webhooks/test

# Get analysis by ID (replace with actual ID)
curl http://localhost:8000/api/v1/analysis/{analysis_id}
```

## Common Commands

### Docker Management

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f celery-worker

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Database Setup

```bash
# Setup MongoDB collections and Neo4j schema
docker-compose exec api python scripts/setup_databases.py
```

### Scaling

```bash
# Scale Celery workers
docker-compose up -d --scale celery-worker=4
```

## Troubleshooting

### Problem: API won't start

**Check:**
```bash
docker-compose logs api
```

**Common causes:**
- Missing environment variables in .env
- Database connection issues
- Port 8000 already in use

**Solution:**
```bash
# Check .env file has all required variables
# Verify database URIs are correct
# Stop other services on port 8000
docker-compose down && docker-compose up -d
```

### Problem: Celery tasks not processing

**Check:**
```bash
docker-compose logs celery-worker
```

**Solution:**
```bash
# Restart Celery worker
docker-compose restart celery-worker
```

### Problem: Database connection errors

**MongoDB:**
- Verify URI in .env
- Check IP whitelist in MongoDB Atlas (use 0.0.0.0/0 for testing)

**Neo4j:**
- Verify credentials in .env
- Check Neo4j instance is running

**Redis:**
- Should start automatically with docker-compose
- Check: `docker-compose ps redis`

## Next Steps

1. **Setup GitHub App** - See SETUP.md for detailed instructions
2. **Configure Webhooks** - Point to your deployment URL
3. **Test Analysis** - Push code to a repository with the app installed
4. **Review Results** - Check API endpoints for analysis results
5. **Customize** - Modify agent prompts in `app/services/agents/`

## Getting Help

- **Detailed Setup**: See SETUP.md
- **Project Overview**: See PROJECT_SUMMARY.md
- **API Documentation**: http://localhost:8000/docs
- **Logs**: `docker-compose logs -f`

## Environment Variables Quick Reference

**Essential:**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxxxx
GITHUB_APP_ID=123456
GITHUB_WEBHOOK_SECRET=xxxxx
SECRET_KEY=random-secret-key
```

**Optional:**
```env
TOKEN_COMPANY_API_KEY=xxxxx  # Falls back to simple compression if not set
PHOENIX_ENABLED=True         # Agent observability
```

## Development Mode

To run without Docker:

```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Terminal 1: Redis
redis-server

# Terminal 2: API
uvicorn app.main:app --reload

# Terminal 3: Celery
celery -A app.tasks.celery_app worker --loglevel=info
```

## Production Checklist

Before deploying to production:

- [ ] Set `APP_ENV=production` in .env
- [ ] Set `DEBUG=False` in .env
- [ ] Use strong `SECRET_KEY`
- [ ] Configure SSL/TLS
- [ ] Set proper database access controls
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Review security settings

---

**You're ready to go! 🚀**

Start analyzing code with AI-powered security insights.
