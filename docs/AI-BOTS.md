# AI Bot System

Bots are server-side players that make decisions using AI models or rule-based fallback.

## Architecture

```
Game Manager
    │
    ▼
Bot Controller ─────► AI Driver (LM Studio/Ollama/Cloud)
    │                      │
    │                      ▼
    │               Model API Call
    │                      │
    │                      ▼
    │               JSON Response
    │                      │
    └─────► Fallback ◄─────┘ (if API fails/times out)
              │
              ▼
         Rule-Based Decision
```

## Hybrid Approach

1. **Try AI model** via OpenAI-compatible API
2. **Parse JSON response** into valid action
3. **Validate action** against game state
4. **Fallback to rule-based** if model fails or times out
5. **Log decision** with full transparency

## Pre-Configured Drivers

### LM Studio (Local)

| Name | Model ID | Play Style |
|------|----------|------------|
| Nemotron Nano | nvidia/nemotron-3-nano | Tight-Aggressive |
| Qwen Coder | qwen3-coder-30b | Balanced/Analytical |
| GLM Flash | glm-4.7-flash | Loose-Aggressive |
| Magistral | mistralai/magistral-small | Tight-Aggressive |
| DeepSeek R1 | deepseek-r1-qwen3-8b | Balanced/GTO |
| Qwen 30B | qwen/qwen3-30b | Balanced/Professor |
| Qwen 8B | qwen/qwen3-8b | Tight-Passive/ABC |
| Mistral 24B | mistral-small-24b | Loose-Aggressive |
| Gemma 3N | gemma-3n-e4b | Ultra-Tight/Nit |
| Devstral | mistralai/devstral-small | Exploitative |

### Cloud (API Key Required)

| Name | Provider | Model |
|------|----------|-------|
| Claude | OpenRouter | claude-sonnet-4 |
| GPT-4o | OpenRouter | gpt-4o |
| Gemini Flash | OpenRouter | gemini-2.5-flash |

## Personality System

Each bot has configurable personality traits:

```typescript
interface BotPersonality {
  aggression: number;     // 0-1: passive → aggressive
  tightness: number;      // 0-1: loose → tight
  bluffFreq: number;      // 0-1: never → always
  riskTolerance: number;  // 0-1: risk-averse → gambler
  thinkTimeMs: [min, max]; // Simulated think delay
}
```

## Prompt Structure

```
You are playing Texas Hold'em poker. You are {botName}, a {playStyle} player.

Current hand state:
- Your cards: {holeCards}
- Community cards: {communityCards}
- Pot: {potSize}
- Your stack: {stack}
- Position: {position}

Players at table:
{playerList}

Your valid actions:
{validActions}

Respond with JSON:
{
  "action": "fold|check|call|bet|raise|all_in",
  "amount": <number if bet/raise>,
  "reasoning": "<brief thought>",
  "hand_assessment": "<hand strength>"
}
```

## Decision Logging

Every decision is logged with full transparency:

```typescript
interface BotDecision {
  botId: string;
  botName: string;
  modelId: string;
  prompt: string;          // Full prompt sent
  rawResponse: string;     // Raw model output
  action: PlayerAction;    // Parsed action
  reasoning: string;       // Model's reasoning
  handAssessment: string;
  inferenceTimeMs: number;
  tokens?: { prompt, completion };
  isFallback: boolean;     // true if rule-based
  handNumber: number;
  gameId: string;
  street: string;
}
```

## Model Warmup

To prevent cold-start delays:

1. Click **🔥 Warm Up** in Debug Panel → Drivers tab
2. Sends a tiny prompt to load model into memory
3. Subsequent calls skip the ~10s load time

## Bot Labels (Non-Negotiable)

Bots are **always** clearly labeled:
- 🤖 badge on player seat
- Model name displayed
- Cannot impersonate humans

## Failover

If AI call fails:
1. Log the error
2. Use rule-based strategy with bot's personality params
3. Never stall the game
