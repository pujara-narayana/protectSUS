# ProtectSUS

**AI-Powered Code Security Analysis Platform**

ProtectSUS is an intelligent security analysis platform that automatically detects vulnerabilities in your code, generates fixes, and creates pull requests - all powered by multi-agent AI systems using Claude 3.5 Sonnet.

## Features

- **Automated Security Analysis**: Multi-agent system analyzes code for vulnerabilities and dependency risks
- **Intelligent Fix Generation**: AI-powered automated fix generation with pull request creation
- **GitHub Integration**: Seamless webhook integration for automatic analysis on push/PR events
- **Knowledge Graph**: Track vulnerability patterns and code relationships across repositories
- **Reinforcement Learning**: Continuous improvement based on user feedback
- **Interactive Chat**: Ask questions about security findings in natural language
- **Token Compression**: Efficient code compression for large repositories

## Architecture

### Tech Stack

- **Backend**: FastAPI 0.109.0
- **AI/ML**: Multi-provider LLM support (Anthropic Claude, OpenAI GPT, Google Gemini, OpenRouter), LangGraph 0.0.40, scikit-learn 1.4.0
- **Task Queue**: Celery 5.3.4 with Redis
- **Databases**: MongoDB Atlas 7.0, Neo4j AuraDB 5.15, Redis 7.2
- **Code Analysis**: Token Company API (bear-1 model)
- **Deployment**: Docker 24.0, Nginx 1.24

### Multi-Agent System

ProtectSUS uses a LangGraph-based multi-agent architecture:

1. **Vulnerability Assessment Agent (VAA)**: Detects security vulnerabilities (OWASP Top 10, CWE)
2. **Dependency Risk Agent (DRA)**: Analyzes dependency security and supply chain risks

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- MongoDB Atlas account
- Neo4j AuraDB account
- **LLM Provider** - Choose one:
  - Anthropic API key (Claude - Recommended)
  - OpenAI API key (GPT-4/GPT-3.5)
  - Google API key (Gemini - Free tier available)
  - OpenRouter API key (Access to multiple models)
- Token Company API key (optional)
- GitHub App credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/protectsus.git
cd protectsus
```

2. **Create environment file**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials.

3. **Add GitHub App private key**
```bash
cp /path/to/your/github-app-private-key.pem ./
```

4. **Start with Docker Compose**
```bash
./run.sh
# Or manually: docker-compose up -d
```

The API will be available at `http://localhost:8000`

### Development Setup

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Run locally**
```bash
# Terminal 1: Start API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Celery worker
celery -A app.tasks.celery_app worker --loglevel=info
```

## API Documentation

Once running, visit:
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

## How It Works

1. **Code Retrieval**: GitHub webhook triggers analysis on push/PR events
2. **Code Compression**: Large codebases are compressed using Token Company API
3. **Multi-Agent Analysis**: Parallel execution of VAA and DRA agents using LangGraph
4. **Fix Generation**: AI generates secure code fixes for detected vulnerabilities
5. **PR Creation**: Automated pull request with fixes and detailed security report
6. **User Feedback**: Users approve/reject fixes, feeding the RL model
7. **Model Update**: RandomForest model improves based on feedback

## Deployment

### Docker Deployment

```bash
docker-compose up -d
```

### Cloud Deployment

Supports DigitalOcean, AWS, and other cloud providers. See deployment guide in PRD.

## License

MIT License

---

**Built for NexHacks Hackathon** | **Powered by Claude 3.5 Sonnet**
