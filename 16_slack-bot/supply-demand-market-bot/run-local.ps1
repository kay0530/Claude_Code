# Supply-Demand Market Weekly Check Bot (Local Edition)
# Uses Claude Code CLI (MAX plan) + Slack Incoming Webhook
# Designed to be run by Windows Task Scheduler

param(
    [switch]$DryRun
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

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

Write-Log "=== Supply-Demand Market Weekly Check ==="

# Load config
if (-not (Test-Path $ConfigFile)) {
    Write-Log "Config file not found"
    exit 1
}
$config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$webhookUrl = $config.slack_webhook_url

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-Log "Webhook URL is empty in config"
    exit 1
}

# Load prompt
if (-not (Test-Path $PromptFile)) {
    Write-Log "Prompt file not found"
    exit 1
}
$prompt = Get-Content $PromptFile -Raw -Encoding UTF8

# Check OAuth token expiry
$credFile = Join-Path $env:USERPROFILE ".claude\.credentials.json"
if (Test-Path $credFile) {
    try {
        $creds = Get-Content $credFile -Raw | ConvertFrom-Json
        $expiresAt = $creds.claudeAiOauth.expiresAt
        $nowMs = [long]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
        $expiresDate = [DateTimeOffset]::FromUnixTimeMilliseconds($expiresAt).LocalDateTime
        if ($expiresAt -gt 0 -and $expiresAt -lt $nowMs) {
            Write-Log "OAuth token expired at $expiresDate"
        }
        else {
            Write-Log "OAuth token valid until $expiresDate"
        }
    }
    catch {
        Write-Log "Could not read credentials file"
    }
}

# Run Claude Code
$authError = $false
Write-Log "Running Claude Code analysis..."
try {
    $result = $prompt | & claude -p --allowedTools "WebSearch,WebFetch" 2>&1
    $exitCode = $LASTEXITCODE

    $result | Out-File -FilePath $OutputFile -Encoding UTF8

    if ($exitCode -ne 0) {
        Write-Log "Claude Code exited with code $exitCode"
        $resultStr = ($result | Out-String)
        if ($resultStr -match "OAuth|token|auth|expired|401") {
            Write-Log "OAuth token expiration detected"
            $authMsg = ":rotating_light: OAuth token expired. Run 'claude /login' to fix."
            $resultText = $authMsg
            $authError = $true
        }
    }

    if (-not $authError) {
        $resultText = ($result | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($resultText)) {
            Write-Log "Claude Code returned empty output"
            $resultText = "Claude Code analysis returned no output."
        }
    }
}
catch {
    Write-Log "Claude Code execution failed"
    $resultText = "Claude Code execution failed."
}

Write-Log "Analysis complete. Output length: $($resultText.Length) chars"

# Truncate if too long for Slack
$maxLen = 3800
if ($resultText.Length -gt $maxLen) {
    $resultText = $resultText.Substring(0, $maxLen) + "`n`n... (truncated)"
    Write-Log "Output truncated to $maxLen chars"
}

$slackText = $resultText

# Post to Slack
if ($DryRun) {
    Write-Log "DRY RUN mode"
    Write-Host "---"
    Write-Host $slackText
    Write-Host "---"
    Write-Log "DRY RUN complete"
}
else {
    Write-Log "Posting to Slack..."
    try {
        $escapedText = $slackText.Replace('\', '\\').Replace('"', '\"').Replace("`n", '\n').Replace("`r", '').Replace("`t", '\t')
        $jsonBody = "{`"text`": `"$escapedText`"}"

        $response = Invoke-RestMethod -Uri $webhookUrl -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))

        Write-Log "Successfully posted to Slack"
    }
    catch {
        Write-Log "Slack posting failed"
        try {
            $errorJson = "{`"text`": `":warning: Bot execution error`"}"
            Invoke-RestMethod -Uri $webhookUrl -Method Post `
                -ContentType "application/json; charset=utf-8" `
                -Body ([System.Text.Encoding]::UTF8.GetBytes($errorJson))
        }
        catch {
            Write-Log "Error notification also failed"
        }
        exit 1
    }
}

Write-Log "=== Done ==="
