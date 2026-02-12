# AI Bot System

Bots are server-side players that make decisions using AI models, multi-turn deliberation, and rule-based fallback.

## Architecture

```
                          ┌─────────────────────────────┐
                          │        BotPlayer Entity      │
                          │  (Complete Bot Composition)  │
                          │                              │
                          │  • Model Config + Presets    │
                          │  • Personality + System Prompt│
                          │  • Deliberation Config       │
                          └──────────────┬──────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────┐
│                              BOT DECISION FLOW                                │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. Game Manager requests action for bot                                      │
│          │                                                                    │
│          ▼                                                                    │
│  2. Get/Create Bot Session (conversation context)                             │
│          │                                                                    │
│          ▼                                                                    │
│  3. Deliberation Enabled?                                                     │
│          │                                                                    │
│     YES  │  NO                                                                │
│          │   └──► Single-shot prompt → Model → Parse → Action                 │
│          │                                                                    │
│          ▼                                                                    │
│  4. Multi-Turn Deliberation:                                                  │
│          │                                                                    │
│          ├──► Step 1: "What's my hand strength?" → Response                   │
│          │         (added to session history)                                 │
│          │                                                                    │
│          ├──► Step 2: "What could opponents have?" → Response                 │
│          │         (added to session history)                                 │
│          │                                                                    │
│          ├──► Step 3: "Given my style, what's the play?" → Response           │
│          │         (added to session history)                                 │
│          │                                                                    │
│          └──► Final: "Make decision" → JSON Action                            │
│                                                                               │
│  5. Validate action against valid moves                                       │
│          │                                                                    │
│          ▼                                                                    │
│  6. Log decision with full transparency                                       │
│          │                                                                    │
│          ▼                                                                    │
│  7. Execute action                                                            │
│                                                                               │
│  [Fallback: If any step fails → Rule-based strategy using personality params] │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## BotPlayer Entity

A **BotPlayer** is a complete, reusable composition that defines everything about an AI player. See [ENTITIES.md](./ENTITIES.md) for full specification.

```typescript
interface BotPlayer {
  // Identity
  id: string;                    // UUID
  slug: string;                  // "nemotron-shark"
  displayName: string;           // "Nemotron Shark"
  
  // Model Configuration
  model: {
    provider: 'lmstudio' | 'ollama' | 'openai' | 'anthropic' | 'openrouter';
    modelId: string;             // "nvidia/nemotron-3-nano"
    baseUrl: string;
    presets: {                   // LM Studio/Ollama settings
      temperature: number;
      contextSize: number;
      maxTokens: number;
      topP: number;
      // ... more
    };
  };
  
  // Personality
  personality: {
    style: PlayStyle;
    aggression: number;          // 0-1
    tightness: number;           // 0-1
    bluffFreq: number;           // 0-1
    riskTolerance: number;       // 0-1
    systemPrompt: string;        // The bot's "soul"
    thinkTimeMs: [number, number];
  };
  
  // Deliberation
  deliberation: {
    enabled: boolean;
    maxSteps: number;
    questions: QuestionType[];
    stepTimeoutMs: number;
  };
}
```

## Deliberation System

Instead of one prompt → response, bots have an internal dialogue:

### Question Types

| Type | What It Asks |
|------|--------------|
| `hand_strength` | What do I have? Draws? Scale 1-10? |
| `position` | How does position affect this decision? |
| `opponent_range` | Based on betting, what could they have? |
| `pot_odds` | Is calling mathematically profitable? |
| `player_style` | How should MY personality play this? |
| `bluff_check` | Is this a good bluff spot? |
| `trap_check` | Should I slow-play? |

### Example Deliberation

```
Human's bet: $150 into $200 pot

Bot's internal dialogue:

[hand_strength]
"I have J♥ T♥ on a board of 9♥ 8♦ 2♥. I have an open-ended straight flush 
draw — any Q, 7, or heart gives me a monster. Current hand is just Jack-high, 
but draw equity is huge. Strength: 3/10 made hand, 8/10 with draws."

[opponent_range]
"The villain bet 75% pot on the flop. This sizing suggests either a strong 
made hand (overpair, top pair good kicker) or a semi-bluff. They could have 
AA, KK, QQ, AK, A9, K9, or a flush draw themselves."

[player_style]
"I'm a loose-aggressive player. I don't like calling — I either fold or raise. 
With this much equity, folding is wrong. Raising applies pressure and could 
win immediately if they have a draw or weak top pair."

[final_decision]
{
  "action": "raise",
  "amount": 400,
  "reasoning": "Semi-bluff with huge equity. Pressure their bluff-catchers.",
  "confidence": 7
}
```

### Quick Mode

For trivial decisions (free check, heads-up preflop), bots use 1-step deliberation to save time.

## Session System

Each bot maintains a **unique session** for conversation context:

```
Bot 1 (Session A) ─────► Same Model (Nemotron Nano)
Bot 2 (Session B) ─────► Same Model (Nemotron Nano)
Bot 3 (Session C) ─────► Same Model (Nemotron Nano)
```

### Why Single-Model Mode?

- **No model swapping**: LM Studio unloads/reloads models when switching, causing 10s+ delays
- **Separate contexts**: Each bot builds its own conversation history
- **Different personalities**: Same model, different system prompts and play styles

### Session Lifecycle

1. **Created** when bot joins table
2. **Updated** with each deliberation step (prompt + response)
3. **Trimmed** to 20 messages (rolling window)
4. **Cleared** on model change or game reset

## Pre-Built Bot Library

| Slug | Name | Style | Deliberation | Description |
|------|------|-------|--------------|-------------|
| `nemotron-shark` | Shark | TAG | 3 steps | Calculative predator, pot odds focused |
| `qwen-professor` | Professor | Balanced | 4 steps | Explains reasoning, educational |
| `flash-gunslinger` | Gunslinger | LAG | 1 step | Fast instincts, pressure player |
| `gemma-rock` | The Rock | Tight-Passive | 2 steps | Only plays premium hands |
| `mistral-gambler` | Gambler | Maniac | 2 steps | Lives for action, high variance |
| `deepseek-solver` | Solver | Balanced | 5 steps | GTO-focused, deep analysis |
| `devstral-hunter` | Hunter | Exploitative | 3 steps | Finds and exploits weaknesses |

## Decision Logging

Every decision is logged with full transparency:

```typescript
interface BotDecision {
  decisionId: string;            // UUID
  botId: string;
  botName: string;
  modelId: string;
  sessionId?: string;            // Bot session for context
  
  // Prompt & Response
  prompt: string;
  rawResponse: string;
  action: { type: string; amount?: number };
  
  // Reasoning
  reasoning: string;
  handAssessment: string;
  
  // Deliberation (if multi-turn)
  deliberation?: {
    steps: { question: string; response: string; durationMs: number }[];
    totalDurationMs: number;
    confidence: number;
  };
  
  // Performance
  inferenceTimeMs: number;
  tokens?: { prompt: number; completion: number };
  
  // Context
  isFallback: boolean;
  timestamp: number;
  handNumber: number;
  gameId: string;
  gameUuid: string;
  handUuid: string;
  street: string;
}
```

## Configuration

### Runtime Settings

```typescript
{
  deliberationEnabled: true,     // Enable multi-turn deliberation
  deliberationMaxSteps: 3,       // Max questions before decision
  deliberationStepTimeoutMs: 5000, // Timeout per step
  aiTimeoutMs: 30000,            // Overall AI timeout
  botThinkMinMs: 1000,           // Simulated think time
  botThinkMaxMs: 2500,
}
```

### Update via API

```bash
POST /api/v1/settings
{
  "deliberationEnabled": true,
  "deliberationMaxSteps": 4
}
```

## Bot Labels (Non-Negotiable)

Bots are **always** clearly labeled:
- 🤖 badge on player seat
- Model name displayed (e.g., "Nemotron Nano")
- Cannot impersonate humans
- Style indicator in debug panel

## Failover

If AI call fails at any point:
1. Log the error with context
2. Fall back to rule-based strategy using bot's personality params
3. Never stall the game
4. Decision logged as `isFallback: true`
