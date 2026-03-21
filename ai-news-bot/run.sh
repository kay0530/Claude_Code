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

# --- Fetch YouTube RSS feeds via curl + Python3 XML parsing ---
echo "Fetching YouTube RSS feeds..."
YOUTUBE_CHANNELS=(
  "いけともch|UCpUQnk6MaY4o3NdgJmv10cw"
  "AIでサボろうチャンネル|UC9AuyS7U4PxeDSNMJ2srarA"
  "ウェブ職TV|UClNZUVnSFRKKUfJYarEUqdA"
  "チャエン【AI研究所】|UC9buL3Iph_f7AZxdzmiBL8Q"
  "KEITO【AI&WEB ch】|UCfapRkagDtoQEkGeyD3uERQ"
  "NewsPicks|UCfTnJmRQP79C4y_BMF_XrlA"
)

RSS_DATA=""
set +e  # Disable exit-on-error for RSS fetching (non-critical)
for entry in "${YOUTUBE_CHANNELS[@]}"; do
  CH_NAME="${entry%%|*}"
  CH_ID="${entry##*|}"
  RSS_URL="https://www.youtube.com/feeds/videos.xml?channel_id=${CH_ID}"

  echo "  Fetching: ${CH_NAME} ..."
  XML=$(curl -s --max-time 10 "$RSS_URL" 2>/dev/null || true)

  if [ -n "$XML" ]; then
    # Parse XML with Python3 (handles namespaces correctly)
    ENTRIES=$(python3 -c "
import xml.etree.ElementTree as ET, sys
xml_data = sys.stdin.read()
try:
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom', 'media': 'http://search.yahoo.com/mrss/'}
    for e in root.findall('atom:entry', ns)[:5]:
        title = (e.find('atom:title', ns).text or '') if e.find('atom:title', ns) is not None else ''
        pub = ((e.find('atom:published', ns).text or '')[:10]) if e.find('atom:published', ns) is not None else ''
        link = e.find('atom:link[@rel=\"alternate\"]', ns)
        url = link.get('href', '') if link is not None else ''
        desc_el = e.find('media:group/media:description', ns) if e.find('media:group', ns) is not None else None
        desc = (desc_el.text or '')[:200] if desc_el is not None and desc_el.text else ''
        print(f'\u30fb{pub}\u300c{title}\u300d')
        print(f'  {url}')
        if desc:
            print(f'  \u8aac\u660e: {desc}')
        print()
except Exception as ex:
    print(f'Parse error: {ex}', file=sys.stderr)
" <<< "$XML" 2>/dev/null || true)

    if [ -n "$ENTRIES" ]; then
      RSS_DATA="${RSS_DATA}
[${CH_NAME}]
${ENTRIES}"
    fi
  else
    echo "  WARNING: Failed to fetch RSS for ${CH_NAME}"
  fi
done
set -e  # Re-enable exit-on-error

echo "RSS feed fetching complete."
echo ""

# Read prompt from file
PROMPT=$(cat "$PROMPT_FILE")

# Append YouTube RSS data to prompt if available
if [ -n "$RSS_DATA" ]; then
  PROMPT="${PROMPT}

## 事前取得済みYouTube RSSデータ（以下はcurlで取得済みのデータです。WebFetchでの再取得は不要です）

${RSS_DATA}"
  echo "YouTube RSS data appended to prompt (${#RSS_DATA} chars)"
else
  echo "WARNING: No YouTube RSS data was fetched"
fi

# Run Claude Code in non-interactive mode with web search (pipe via stdin to avoid arg length limits)
echo "Running Claude Code analysis..."
echo "$PROMPT" | npx -y @anthropic-ai/claude-code -p \
  --allowedTools "WebSearch,WebFetch" \
  > "$OUTPUT_FILE" 2>&1 || {
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
