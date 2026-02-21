# Supply-Demand Market Weekly Check Bot (Local Edition)
# Uses Claude Code CLI (MAX plan) + Slack Incoming Webhook
# Designed to be run by Windows Task Scheduler

param(
    [switch]$DryRun  # -DryRun to test without posting to Slack
)

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

Write-Log "=== Supply-Demand Market Weekly Check ==="

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

# --- Run Claude Code ---
Write-Log "Running Claude Code analysis..."
try {
    $result = & claude -p --allowedTools "WebSearch,WebFetch" $prompt 2>&1
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

# --- Build Slack message ---
$today = Get-Date -Format "yyyy/MM/dd"
$slackText = ":zap: *需給調整市場 週次レポート*`n${today} (月曜定期配信)`n`n${resultText}"

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
            $errorJson = "{`"text`": `":warning: 需給調整市場チェックボットの実行中にエラーが発生しました: $_`"}"
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
