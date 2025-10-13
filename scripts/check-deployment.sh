#!/bin/bash

# Deployment Status Checker
# Run this script to check if the bot is running and up-to-date

echo "🔍 Checking RAVNSPIRE Bot Deployment Status..."
echo "=============================================="

# Check if PM2 is running
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🤖 Bot Process Details:"
pm2 show ravnspire-bot

echo ""
echo "📝 Recent Bot Logs (last 20 lines):"
pm2 logs ravnspire-bot --lines 20

echo ""
echo "🗂️ Current Git Status:"
cd /home/ubuntu/discord-bots/ravnspire
git status
echo ""
echo "📅 Last Commit:"
git log --oneline -1

echo ""
echo "🔄 Checking for Updates:"
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Bot is up-to-date with GitHub"
else
    echo "⚠️ Bot is behind GitHub - needs update"
    echo "Local:  $LOCAL"
    echo "Remote: $REMOTE"
fi

echo ""
echo "🌐 GitHub Actions Status:"
echo "Check: https://github.com/gotEve/RAVNSPIRE-Dev2-DC---UNHINGED-SPECTACLE/actions"
