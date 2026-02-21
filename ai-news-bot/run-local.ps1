# AI News Weekly Check Bot - Japan (Local Edition)
# Uses Claude Code CLI (MAX plan) + Slack Incoming Webhook
# Designed to be run by Windows Task Scheduler

param(
    [switch]$DryRun  # -DryRun to test without posting to Slack
)

# Force UTF-8 for console and pipe output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigFile = Join-Path $ScriptDir "config.local.json"
$PromptFile = Join-Path $ScriptDir "prompt.md"
$OutputFile = Join-Path $ScriptDir "output.txt"
$LogFile = Join-Path $ScriptDir "run.log"

# --- Logging ---
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

Write-Log "=== AI News Weekly Check (Japan) ==="

# --- Load config ---
if (-not (Test-Path $ConfigFile)) {
    Write-Log "ERROR: $ConfigFile not found. Create it with {`"slack_webhook_url`": `"https://...`"}"
    exit 1
}
$config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$webhookUrl = $config.slack_webhook_url

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-Log "ERROR: slack_webhook_url is empty in config"
    exit 1
}

# --- Load prompt ---
if (-not (Test-Path $PromptFile)) {
    Write-Log "ERROR: $PromptFile not found"
    exit 1
}
$prompt = Get-Content $PromptFile -Raw -Encoding UTF8

# --- Fetch YouTube RSS feeds ---
Write-Log "Fetching YouTube RSS feeds..."
$youtubeChannels = @(
    @{ Name = "いけともch"; Id = "UCpUQnk6MaY4o3NdgJmv10cw" }
    @{ Name = "AIでサボろうチャンネル"; Id = "UC9AuyS7U4PxeDSNMJ2srarA" }
    @{ Name = "ウェブ職TV"; Id = "UClNZUVnSFRKKUfJYarEUqdA" }
    @{ Name = "チャエン【AI研究所】"; Id = "UC9buL3Iph_f7AZxdzmiBL8Q" }
    @{ Name = "KEITO【AI&WEB ch】"; Id = "UCfapRkagDtoQEkGeyD3uERQ" }
    @{ Name = "NewsPicks"; Id = "UCfTnJmRQP79C4y_BMF_XrlA" }
)

$rssData = ""
foreach ($ch in $youtubeChannels) {
    $rssUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=$($ch.Id)"
    Write-Log "  Fetching: $($ch.Name) ..."
    try {
        $response = Invoke-WebRequest -Uri $rssUrl -TimeoutSec 10 -UseBasicParsing
        [xml]$xml = $response.Content

        $entries = $xml.feed.entry | Select-Object -First 5
        if ($entries) {
            $rssData += "`n[$($ch.Name)]`n"
            foreach ($entry in $entries) {
                $title = $entry.title
                $published = $entry.published.Substring(0, 10)
                $videoUrl = ($entry.link | Where-Object { $_.rel -eq "alternate" }).href
                if (-not $videoUrl) { $videoUrl = $entry.link.href }
                $description = ""
                if ($entry.group -and $entry.group.description) {
                    $description = [string]$entry.group.description
                    if ($description.Length -gt 200) { $description = $description.Substring(0, 200) }
                }
                $rssData += "・${published}「${title}」`n"
                $rssData += "  ${videoUrl}`n"
                if ($description) {
                    $rssData += "  説明: ${description}`n"
                }
                $rssData += "`n"
            }
        }
    }
    catch {
        Write-Log "  WARNING: Failed to fetch RSS for $($ch.Name): $_"
    }
}

Write-Log "RSS feed fetching complete."

# Append YouTube RSS data to prompt if available
if ($rssData) {
    $prompt += "`n`n## 事前取得済みYouTube RSSデータ（以下はcurlで取得済みのデータです。WebFetchでの再取得は不要です）`n${rssData}"
    Write-Log "YouTube RSS data appended to prompt ($($rssData.Length) chars)"
}
else {
    Write-Log "WARNING: No YouTube RSS data was fetched"
}

# --- Run Claude Code ---
Write-Log "Running Claude Code analysis..."
try {
    # Pipe prompt via stdin (avoids command-line length limits and encoding issues)
    $result = $prompt | & claude -p --allowedTools "WebSearch,WebFetch" 2>&1
    $exitCode = $LASTEXITCODE

    # Save output
    $result | Out-File -FilePath $OutputFile -Encoding UTF8

    if ($exitCode -ne 0) {
        Write-Log "WARNING: Claude Code exited with code $exitCode"
    }

    $resultText = ($result | Out-String).Trim()

    if ([string]::IsNullOrWhiteSpace($resultText)) {
        Write-Log "ERROR: Claude Code returned empty output"
        $resultText = "Claude Code analysis returned no output. Please check the logs."
    }
}
catch {
    Write-Log "ERROR: Claude Code execution failed: $_"
    $resultText = "Claude Code execution failed. Error: $_"
}

Write-Log "Analysis complete. Output length: $($resultText.Length) chars"

# --- Truncate if too long for Slack ---
$maxLen = 3800
if ($resultText.Length -gt $maxLen) {
    $resultText = $resultText.Substring(0, $maxLen) + "`n`n... (出力が長いため省略。詳細は output.txt を参照)"
    Write-Log "Output truncated to $maxLen chars"
}

# --- Build Slack message (Claude output already includes header) ---
$slackText = $resultText

# --- Post to Slack ---
if ($DryRun) {
    Write-Log "DRY RUN - Would post to Slack:"
    Write-Host "---"
    Write-Host $slackText
    Write-Host "---"
    Write-Log "DRY RUN complete. No message sent."
}
else {
    Write-Log "Posting to Slack..."
    try {
        # Escape for JSON
        $escapedText = $slackText.Replace('\', '\\').Replace('"', '\"').Replace("`n", '\n').Replace("`r", '').Replace("`t", '\t')
        $jsonBody = "{`"text`": `"$escapedText`"}"

        $response = Invoke-RestMethod -Uri $webhookUrl -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))

        Write-Log "Successfully posted to Slack"
    }
    catch {
        Write-Log "ERROR: Slack posting failed: $_"

        # Try posting error notification
        try {
            $errorJson = "{`"text`": `":warning: AIニュースボットの実行中にエラーが発生しました: $_`"}"
            Invoke-RestMethod -Uri $webhookUrl -Method Post `
                -ContentType "application/json; charset=utf-8" `
                -Body ([System.Text.Encoding]::UTF8.GetBytes($errorJson))
        }
        catch {
            Write-Log "ERROR: Even error notification failed: $_"
        }
        exit 1
    }
}

Write-Log "=== Done ==="
