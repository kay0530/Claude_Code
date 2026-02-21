#!/bin/bash
# AI News Weekly Check Bot (Japan)
# Runs Claude Code to research AI news and posts to Slack
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="${SCRIPT_DIR}/prompt.md"
OUTPUT_FILE="${SCRIPT_DIR}/output.txt"

# Validate required environment variables
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  echo "ERROR: SLACK_WEBHOOK_URL is not set"
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ERROR: ANTHROPIC_API_KEY is not set"
  exit 1
fi

echo "=== AI News Weekly Check (Japan) ==="
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Read prompt from file
PROMPT=$(cat "$PROMPT_FILE")

# Run Claude Code in non-interactive mode with web search
echo "Running Claude Code analysis..."
npx -y @anthropic-ai/claude-code -p \
  --allowedTools "WebSearch,WebFetch" \
  "$PROMPT" > "$OUTPUT_FILE" 2>&1 || {
    echo "Claude Code execution failed. Output:"
    cat "$OUTPUT_FILE"
    # Post error notification to Slack
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-type: application/json' \
      -d "{\"text\": \":warning: AIニュースボットの実行に失敗しました。\nGitHub Actionsのログを確認してください。\"}"
    exit 1
  }

echo "Claude Code analysis complete."
echo ""

# Read the output
RESULT=$(cat "$OUTPUT_FILE")

# Truncate if too long for Slack (max ~40000 chars, but we keep it reasonable)
MAX_LEN=3900
if [ ${#RESULT} -gt $MAX_LEN ]; then
  RESULT="${RESULT:0:$MAX_LEN}

... (出力が長いため省略されました。詳細はGitHub Actionsのログを参照してください。)"
fi

# Post to Slack via Incoming Webhook
echo "Posting to Slack..."
SLACK_PAYLOAD=$(jq -n \
  --arg text "🤖 *日本AIニュース 週次レポート*
$(date -u -d '+9 hours' '+%Y/%m/%d' 2>/dev/null || date -u '+%Y/%m/%d') (月曜定期配信)

${RESULT}" \
  '{text: $text}')

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  -d "$SLACK_PAYLOAD")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Successfully posted to Slack (HTTP $HTTP_STATUS)"
else
  echo "Failed to post to Slack (HTTP $HTTP_STATUS)"
  # Try simpler payload as fallback
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\": \":warning: AIニュースボット: Slack投稿でエラーが発生しました (HTTP ${HTTP_STATUS})。GitHub Actionsログを確認してください。\"}"
  exit 1
fi

echo "=== Done ==="
