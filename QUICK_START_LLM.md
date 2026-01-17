# Quick LLM Provider Setup

Choose your AI provider and get started in 2 minutes!

## Step 1: Choose Provider

Pick the one that works best for you:

### 🔵 Anthropic Claude (Recommended)
**Best for**: Security analysis accuracy
**Cost**: $3-15 per 1M tokens
**Sign up**: https://console.anthropic.com/

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 🟢 OpenAI GPT
**Best for**: Reliability and support
**Cost**: $0.50-30 per 1M tokens (varies by model)
**Sign up**: https://platform.openai.com/

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxx
```

### 🔴 Google Gemini
**Best for**: Free tier testing
**Cost**: Free tier available!
**Sign up**: https://makersuite.google.com/app/apikey

```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=xxxxx
```

### 🟣 OpenRouter
**Best for**: Access to multiple models
**Cost**: Varies by model
**Sign up**: https://openrouter.ai/

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-xxxxx
```

## Step 2: Add to .env

Open your `.env` file and add:

```env
# Choose your provider
LLM_PROVIDER=anthropic

# Add your API key
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Step 3: Restart

```bash
docker-compose restart

# Or if running locally
# Ctrl+C then restart uvicorn and celery
```

## That's it! 🎉

Your agents will now use your chosen LLM provider.

## Testing

Verify it works:

```bash
curl http://localhost:8000/health
```

## Need Help?

See `LLM_PROVIDERS.md` for detailed configuration options.

## Common Questions

**Q: Can I use multiple providers?**
A: Yes! Edit the agent initialization code to use different providers for different tasks.

**Q: Which is cheapest?**
A: Google Gemini has a free tier, OpenAI GPT-3.5-turbo is $0.50-1.50 per 1M tokens.

**Q: Which is best for security?**
A: Anthropic Claude 3.5 Sonnet gives the best security analysis results.

**Q: Can I switch providers later?**
A: Yes! Just change `LLM_PROVIDER` and the API key in `.env` and restart.
