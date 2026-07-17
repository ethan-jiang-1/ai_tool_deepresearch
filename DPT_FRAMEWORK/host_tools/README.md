# DeepSeek Claude Code Launcher

Pre-trigger host tool. Launches Claude Code connected to a DeepSeek Anthropic-compatible endpoint. Prerequisites: Node.js >= 20, `claude` on PATH.

## Usage

```bash
# Verify everything is ready
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check

# Launch — all arguments pass through to claude
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello"
node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --verbose
```

The launcher's CLI surface is identical to `claude` — same arguments, same exit codes, same stdio. The only launcher-owned flag is first-argument `--check` for preflight.

## If You Haven't Set Up Yet

```bash
cp .env.example .env   # from repo root
```

Edit `.env` — three required values:

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
DEEPSEEK_MODEL=deepseek-v4-pro
```

Then run `--check` above.

## What It Does

1. Reads supported `DEEPSEEK_*` values from repo-root `.env` (parsed as data, never shell-evaluated)
2. Cleans inherited `ANTHROPIC_*` / `DEEPSEEK_*` env vars to prevent provider routing contamination
3. Validates required values and endpoint URL format
4. Exports Claude-facing env vars and launches `claude` with your arguments

## What It Does NOT Do

- Mutate global Claude settings or inject a settings file
- Append `--allow-dangerously-skip-permissions` (pass it yourself if needed)
- Fall back to a default or built-in credentials
- Create Engine, workflow, Runtime Bundle, or permission authority
