# Deployment Status Checker (PowerShell)
# Run this script to check if the bot is running and up-to-date

Write-Host "🔍 Checking RAVNSPIRE Bot Deployment Status..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Check if PM2 is running
Write-Host "`n📊 PM2 Status:" -ForegroundColor Yellow
pm2 status

Write-Host "`n🤖 Bot Process Details:" -ForegroundColor Yellow
pm2 show ravnspire-bot

Write-Host "`n📝 Recent Bot Logs (last 20 lines):" -ForegroundColor Yellow
pm2 logs ravnspire-bot --lines 20

Write-Host "`n🗂️ Current Git Status:" -ForegroundColor Yellow
Set-Location /home/ubuntu/discord-bots/ravnspire
git status
Write-Host "`n📅 Last Commit:" -ForegroundColor Yellow
git log --oneline -1

Write-Host "`n🔄 Checking for Updates:" -ForegroundColor Yellow
git fetch origin
$LOCAL = git rev-parse HEAD
$REMOTE = git rev-parse origin/main

if ($LOCAL -eq $REMOTE) {
    Write-Host "✅ Bot is up-to-date with GitHub" -ForegroundColor Green
} else {
    Write-Host "⚠️ Bot is behind GitHub - needs update" -ForegroundColor Red
    Write-Host "Local:  $LOCAL" -ForegroundColor Red
    Write-Host "Remote: $REMOTE" -ForegroundColor Red
}

Write-Host "`n🌐 GitHub Actions Status:" -ForegroundColor Yellow
Write-Host "Check: https://github.com/gotEve/RAVNSPIRE-Dev2-DC---UNHINGED-SPECTACLE/actions" -ForegroundColor Blue
