# LLM token/pricing mechanics + agent tooling — cross-provider reference

> Anthropic figures come from the official Claude API skill data (cached 2026-06-24) — high confidence.
> All other providers are sourced from web aggregators (pricepertoken, costgoat, felloai, morphllm, mem0, benchlm, finout, cloudzero, curlscape, tokencostcalculators) pulled 2026-08-11 — **verify against the provider's official pricing page before budgeting real spend**. Aggregators lag or misquote often, especially for brand-new model names in a fast-moving market.

## 1. Pricing & context window — every provider, one table

| Provider     | Model                           | Context | Max output | Input $/1M                    | Output $/1M               | Cache-hit input $/1M |
|--------------|---------------------------------|---------|------------|-------------------------------|---------------------------|----------------------|
| Anthropic    | Opus 5                          | 1M      | 128K       | $5                            | $25                       | ~$0.50 (~0.1x)       |
| Anthropic    | Opus 4.8                        | 1M      | 128K       | $5                            | $25                       | ~$0.50 (~0.1x)       |
| Anthropic    | Sonnet 5                        | 1M      | 128K       | $3 (intro $2 thru 2026-08-31) | $15 (intro $10)           | ~$0.30 (~0.1x)       |
| Anthropic    | Haiku 4.5                       | 200K    | 64K        | $1                            | $5                        | ~$0.10 (~0.1x)       |
| Google       | Gemini 3.6 Flash                | 1M      | —          | $1.50                         | $7.50                     | —                    |
| Google       | Gemini 3.1 Pro, >200K input     | 1M      | —          | $4.00                         | $18.00                    | —                    |
| OpenAI       | GPT-5.6 "Sol" long-context tier | —       | —          | $10.00                        | $45.00                    | —                    |
| OpenAI       | GPT-5.5 (flagship)              | 1M      | —          | $5.00                         | $30.00                    | $0.50                |
| OpenAI       | GPT-5.4                         | 1.1M    | —          | $2.50                         | $15.00                    | —                    |
| DeepSeek     | DeepSeek-V4-Pro                 | 1M      | 384K       | $0.435                        | $0.87                     | $0.003625            |
| DeepSeek     | DeepSeek-V4-Flash               | 1M      | 384K       | $0.14                         | $0.28                     | $0.0028              |
| xAI          | Grok 4.5 (flagship)             | 500K    | —          | $2.00                         | $6.00                     | ~$0.30 (~85% off)    |
| MiniMax      | MiniMax-M3, >512K               | >512K   | —          | $0.60                         | $2.40                     | $0.06                |
| MiniMax      | MiniMax-M3, ≤512K               | ≤512K   | —          | $0.30 (promo; list $0.60)     | $1.20 (promo; list $2.40) | $0.06                |
| Moonshot AI  | Kimi K3 (flagship, 2026-07-16)  | —       | —          | $3.00                         | $15.00                    | —                    |
| Zhipu / Z.ai | GLM-4.6                         | —       | —          | ~$0.43                        | ~$1.75                    | —                    |

Notes: DeepSeek cheapest across the board. Every Gemini tier ships 1M context even at the cheapest rung — most competitors reserve 1M for flagship only. OpenAI/Gemini both step to a pricier tier past a context threshold (200K for Gemini Pro, similar shape on OpenAI's "Sol" tier). Cache-write premium not shown in the table — see formula below.

Cache write: Anthropic 1.25x (5min TTL) / 2x (1h TTL) of base input price. MiniMax cache write $0.375/1M. Batch APIs (Anthropic, Google, OpenAI, others): ~50% off both input and output, no realtime SLA.

---

## 2. Final price formula

Per-request cost, general form:

$$
C = \underbrace{t_{u} \cdot p_{in}}_{\text{uncached input}} \;+\; \underbrace{t_{r} \cdot p_{in} \cdot m_{r}}_{\text{cache read}} \;+\; \underbrace{t_{w} \cdot p_{in} \cdot m_{w}}_{\text{cache write}} \;+\; \underbrace{t_{out} \cdot p_{out}}_{\text{output (incl. thinking)}}
$$

$$
C_{\text{batch}} = C \times 0.5 \quad \text{(where batch/async tier offered)}
$$

$$
C_{\text{session}} = \sum_{i=1}^{n} C_i \quad \text{(multi-turn / agentic loop — full history resent each turn unless cached)}
$$

**Variables:**

| Symbol | Meaning |
|---|---|
| $t_u$ | uncached input tokens — not served from any cache entry |
| $t_r$ | cache-read input tokens — matched an existing cache entry |
| $t_w$ | cache-write input tokens — newly written to cache this request |
| $t_{out}$ | total output tokens, **including hidden reasoning/thinking tokens** |
| $p_{in}$ | list input price, $/token ($/1M price ÷ 1,000,000) |
| $p_{out}$ | list output price, $/token |
| $m_r$ | cache-read multiplier (~0.1 on Anthropic; provider-specific — see cache-hit column in §1) |
| $m_w$ | cache-write multiplier (1.25–2.0 on Anthropic 5min/1h TTL; MiniMax/DeepSeek instead quote a flat $/1M cache rate — use that directly in place of $p_{in} \cdot m_w$) |
| $n$ | number of requests in the session/loop |

No provider surveyed here discounts output tokens (thinking or otherwise) — $p_{out}$ always applies at full rate to $t_{out}$.

---

## 3. How token billing actually works (same across all providers)

- Every request is billed as input tokens (prompt + full history resent every turn) + output tokens (completion, including hidden reasoning/thinking tokens).
- Context window is the max tokens (input+output combined, usually) allowed in one request — it is a ceiling, not a price lever.
- Reasoning/thinking tokens (Claude extended thinking, OpenAI o-series/GPT-5 reasoning, Gemini thinking mode, DeepSeek R1-style, Grok reasoning effort, Kimi/GLM thinking modes) bill as **output tokens**, whether or not the raw reasoning text is shown to you.
- Prompt caching is a discount for reusing a stable prefix (system prompt, tool list, long doc) across repeat calls. Universal concept, different price ratio per vendor (Claude ~10x cheaper reads / 1.25–2x write premium; DeepSeek ~50–100x cheaper reads; MiniMax/Kimi similar pattern).
- Batch/async APIs (non-realtime) are commonly ~50% cheaper — Claude, Gemini, OpenAI, and others all offer this tier.
- An effort/reasoning-depth parameter (Claude `effort`, OpenAI `reasoning_effort`, Gemini thinking budget, Grok "configurable reasoning") trades thinking-token spend for quality — it doesn't change the $/token rate, it changes how many tokens get spent.

## 4. Compaction / context management (concept universal, naming differs)

| Mechanism         | What it does                                            | Anthropic                                                  | Others (general pattern)                                                                                          |
|-------------------|---------------------------------------------------------|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Compaction        | server-side summarize old turns when near context limit | beta, `compact-2026-01-12`, auto near 150K default trigger | most agent harnesses (Claude Code `/compact`, Codex, Cursor) implement their own client-side compaction similarly |
| Context editing   | strip stale tool-results/thinking blocks, no summarize  | beta `context-management-2025-06-27`                       | vendor-specific, not every provider exposes an API-level equivalent                                               |
| Memory tool/store | write/read files persisted across sessions              | `memory_20250818` tool, or Managed Agents memory stores    | most agent frameworks now ship a similar mechanism (scratch files, vector memory)                                 |

## 5. Agent-harness layer (Claude Code shown as reference — same shape applies to Codex/Cursor/others)

| Concept              | What it is                                       | Token/cost impact                                                                                                                                     |
|----------------------|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Slash command        | reusable prompt template                         | injects its text into context once when invoked                                                                                                       |
| Skill                | on-demand instruction bundle                     | description always sits in context (cheap); full body loads only when triggered                                                                       |
| Subagent / Task tool | separate context window, own conversation thread | own token spend, isolated — protects main thread context from bloat                                                                                   |
| MCP server           | external tool/resource provider via protocol     | tool schemas added to every request's context (cost scales with tool count); a large server bloats tokens unless deferred-loading/tool-search is used |
| Plugin               | bundle of commands/agents/skills/MCP config      | zero direct cost until a piece triggers                                                                                                               |
| Hook                 | shell command fired on a lifecycle event         | runs outside the model, zero token cost                                                                                                               |

## 6. Cost levers (provider-agnostic)

- Prompt caching cuts repeated system-prompt/tool-list cost the most (all providers, ratio varies).
- Fewer/cheaper subagent spawns = less spend (each subagent re-establishes context fresh).
- Lower reasoning-effort/thinking depth = fewer tokens, cheaper, less capable on hard tasks.
- Batch/async endpoints when no real-time response is needed = ~50% off (where offered).
- Route cheap/high-volume work to the cheapest model tier (DeepSeek, MiniMax, Kimi K2.5 currently lead on $/1M); reserve frontier models (Opus, Gemini 3 Pro, GPT-5.5, Grok 4.5, Kimi K3) for hard reasoning steps.
- MCP servers with 30+ tools should use tool search/deferred loading, otherwise every request pays the full schema token tax.

---

**Caveat repeated:** non-Anthropic numbers were sourced from aggregator sites during this session, not official API docs — model names/prices in fast-moving markets (GPT-5.x, Gemini 3.x, Grok-4.x, Kimi K2.x/K3, GLM-4.x/5.x) can be stale or wrong. Confirm on the official pricing page before committing budget.
