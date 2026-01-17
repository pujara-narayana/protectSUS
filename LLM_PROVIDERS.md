# LLM Provider Configuration Guide

ProtectSUS supports multiple LLM providers, giving you the flexibility to choose the AI model that best fits your needs and budget.

## Supported Providers

1. **Anthropic Claude** (Default)
2. **OpenAI GPT**
3. **Google Gemini**
4. **OpenRouter** (Access to multiple models)

## Quick Setup

### 1. Choose Your Provider

Edit your `.env` file and set the `LLM_PROVIDER` variable:

```env
# Choose one: anthropic, openai, gemini, openrouter
LLM_PROVIDER=anthropic
```

### 2. Add API Key

Add the corresponding API key for your chosen provider:

```env
# For Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxxxx

# For OpenAI
OPENAI_API_KEY=sk-xxxxx

# For Google Gemini
GOOGLE_API_KEY=xxxxx

# For OpenRouter
OPENROUTER_API_KEY=sk-or-xxxxx
```

### 3. Restart Services

```bash
docker-compose restart
# Or if running locally
# Restart your uvicorn and celery processes
```

## Provider Details

### Anthropic Claude (Default)

**Model**: `claude-3-5-sonnet-20241022`

**Pros**:
- Best for security analysis tasks
- Large context window (200K tokens)
- Excellent at following complex instructions
- Strong reasoning capabilities

**Cons**:
- Requires Anthropic API key
- Higher cost compared to some alternatives

**Setup**:
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Get API Key**: https://console.anthropic.com/

---

### OpenAI GPT

**Model**: `gpt-4-turbo-preview`

**Pros**:
- Well-established and reliable
- Good documentation and community support
- Fast response times
- Can use GPT-3.5-turbo for cost savings

**Cons**:
- Smaller context window than Claude
- Can be expensive with GPT-4

**Setup**:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxx
```

**Get API Key**: https://platform.openai.com/api-keys

**Alternative Models**:
You can change the model in `app/core/llm_provider.py`:
```python
self.model = "gpt-3.5-turbo"  # Cheaper option
self.model = "gpt-4"          # Latest stable
self.model = "gpt-4-turbo-preview"  # Default
```

---

### Google Gemini

**Model**: `gemini-pro`

**Pros**:
- Free tier available
- Good performance
- Multimodal capabilities
- Fast inference

**Cons**:
- Smaller context window
- Less specialized for security analysis
- Different API structure (no system prompts)

**Setup**:
```env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=xxxxx
```

**Get API Key**: https://makersuite.google.com/app/apikey

**Note**: Gemini combines system and user prompts since it doesn't have a separate system prompt parameter.

---

### OpenRouter

**Model**: `anthropic/claude-3.5-sonnet` (or any OpenRouter model)

**Pros**:
- Access to multiple models through one API
- Pay-as-you-go pricing
- Can switch models without code changes
- Rate limiting handled by OpenRouter

**Cons**:
- Additional layer between you and the model
- Slightly higher latency
- Requires OpenRouter account

**Setup**:
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-xxxxx
```

**Get API Key**: https://openrouter.ai/keys

**Available Models**:
You can change the model in `app/core/llm_provider.py`:
```python
self.model = "anthropic/claude-3.5-sonnet"
self.model = "openai/gpt-4-turbo-preview"
self.model = "google/gemini-pro"
self.model = "meta-llama/llama-2-70b-chat"
# And many more...
```

See all models: https://openrouter.ai/models

---

## Customizing the Model

To use a different model within a provider, edit `app/core/llm_provider.py`:

### For Anthropic:
```python
def _init_anthropic(self):
    from anthropic import Anthropic
    self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    self.model = "claude-3-opus-20240229"  # Change here
```

### For OpenAI:
```python
def _init_openai(self):
    from openai import OpenAI
    self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    self.model = "gpt-3.5-turbo"  # Change here
```

### For Gemini:
```python
def _init_gemini(self):
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    self.client = genai
    self.model = "gemini-pro"  # Change here
```

### For OpenRouter:
```python
def _init_openrouter(self):
    from openai import OpenAI
    self.client = OpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1"
    )
    self.model = "mistralai/mistral-medium"  # Change here
```

## Cost Comparison

Approximate costs per 1M tokens (as of Jan 2025):

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| Anthropic | Claude 3.5 Sonnet | $3 | $15 |
| OpenAI | GPT-4 Turbo | $10 | $30 |
| OpenAI | GPT-3.5 Turbo | $0.50 | $1.50 |
| Google | Gemini Pro | Free tier available | - |
| OpenRouter | Varies by model | Varies | Varies |

**Note**: Prices are approximate and subject to change. Check provider websites for current pricing.

## Performance Recommendations

### Best for Security Analysis:
1. **Anthropic Claude 3.5 Sonnet** - Most accurate for security tasks
2. **OpenAI GPT-4 Turbo** - Good alternative
3. **OpenRouter with Claude** - Same quality, more flexibility

### Best for Cost:
1. **Google Gemini** - Free tier
2. **OpenAI GPT-3.5 Turbo** - Low cost, decent quality
3. **OpenRouter with smaller models** - Flexible pricing

### Best for Speed:
1. **Google Gemini** - Fast inference
2. **OpenAI GPT-3.5 Turbo** - Quick responses
3. **OpenRouter** - Varies by model

## Testing Different Providers

You can test different providers without restarting:

```python
# In Python/IPython shell
from app.core.llm_provider import LLMClient

# Test Anthropic
claude = LLMClient(provider="anthropic")
response = await claude.generate(
    system_prompt="You are a helpful assistant.",
    user_prompt="What is 2+2?",
    temperature=0.0
)
print(response['text'])

# Test OpenAI
gpt = LLMClient(provider="openai")
response = await gpt.generate(
    system_prompt="You are a helpful assistant.",
    user_prompt="What is 2+2?",
    temperature=0.0
)
print(response['text'])
```

## Troubleshooting

### Error: "API key not set"
- Make sure you've set the correct API key in `.env`
- Verify the environment variable matches the provider (e.g., `OPENAI_API_KEY` for OpenAI)
- Restart your services after updating `.env`

### Error: "Unsupported LLM provider"
- Check that `LLM_PROVIDER` is set to one of: `anthropic`, `openai`, `gemini`, `openrouter`
- Check for typos in the provider name

### Error: "Module not found"
- Make sure you've installed the required packages:
  ```bash
  pip install anthropic openai google-generativeai
  ```

### Poor Quality Results
- Try a more capable model (e.g., GPT-4 instead of GPT-3.5)
- Adjust temperature (lower = more focused, higher = more creative)
- Check that prompts are optimized for your chosen provider

## Environment Variables Reference

```env
# Provider Selection
LLM_PROVIDER=anthropic  # or openai, gemini, openrouter

# Provider API Keys (set only the one you're using)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
```

## Advanced Configuration

### Using Multiple Providers

You can configure different providers for different tasks by modifying the service initialization:

```python
# In app/services/agents/vulnerability_agent.py
def __init__(self):
    super().__init__("VulnerabilityAgent", llm_provider="anthropic")

# In app/services/agents/dependency_agent.py
def __init__(self):
    super().__init__("DependencyAgent", llm_provider="openai")
```

### Custom Model Configuration

Create a custom configuration in `app/core/config.py`:

```python
# Custom model configurations
ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
OPENAI_MODEL: str = "gpt-4-turbo-preview"
GEMINI_MODEL: str = "gemini-pro"
OPENROUTER_MODEL: str = "anthropic/claude-3.5-sonnet"
```

Then update `llm_provider.py` to use these settings.

## Support

For provider-specific issues:
- **Anthropic**: https://docs.anthropic.com/
- **OpenAI**: https://platform.openai.com/docs
- **Google Gemini**: https://ai.google.dev/docs
- **OpenRouter**: https://openrouter.ai/docs

---

**Need help choosing?** Start with the default (Anthropic Claude) for best results, or use Google Gemini if you want to test for free.
