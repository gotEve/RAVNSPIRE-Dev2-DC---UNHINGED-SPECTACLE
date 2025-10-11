# 🚀 Ravnspire Bot Hosting Guide

## 🎯 **QUICK START (Railway - Recommended)**

### **Step 1: Prepare Your Repository**
```bash
# Make sure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### **Step 2: Deploy to Railway**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect it's a Node.js app

### **Step 3: Add PostgreSQL**
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`

### **Step 4: Set Environment Variables**
In Railway dashboard, go to Variables tab:
```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id (optional)
NODE_ENV=production
```

### **Step 5: Deploy Commands**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and connect to your project
railway login
railway link

# Deploy commands
railway run node scripts/deploy.js
```

## 🐳 **ALTERNATIVE: Heroku**

### **Step 1: Prepare for Heroku**
```bash
# Create Procfile (already created)
echo "worker: node index.js" > Procfile

# Initialize git if not done
git init
git add .
git commit -m "Initial commit"
```

### **Step 2: Deploy to Heroku**
```bash
# Install Heroku CLI
# Download from heroku.com

# Login and create app
heroku login
heroku create your-bot-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set DISCORD_TOKEN=your_token_here
heroku config:set CLIENT_ID=your_client_id_here
heroku config:set GUILD_ID=your_guild_id_here

# Deploy
git push heroku main

# Deploy commands
heroku run node scripts/deploy.js
```

## 🌐 **ALTERNATIVE: Render**

### **Step 1: Connect Repository**
1. Go to [render.com](https://render.com)
2. Sign up and connect GitHub
3. Create "New Web Service"
4. Select your repository

### **Step 2: Configure Service**
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Environment**: `Node`

### **Step 3: Add PostgreSQL**
1. Create "New PostgreSQL" service
2. Copy the connection string
3. Set as `DATABASE_URL` in your web service

### **Step 4: Set Environment Variables**
```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
```

## 🔧 **POSTGRESQL SETUP**

### **Automatic Setup (Recommended)**
Your bot will automatically:
1. Connect to PostgreSQL using `DATABASE_URL`
2. Run the schema setup
3. Insert initial data

### **Manual Setup (If Needed)**
```bash
# Connect to your hosted PostgreSQL
# Railway: railway connect postgres
# Heroku: heroku pg:psql
# Render: Use connection string in pgAdmin

# Run schema
\i database/schema.sql

# Insert initial data
\i database/initial_data.sql
```

## 📊 **HOSTING COMPARISON**

| Feature | Railway | Heroku | Render |
|---------|---------|--------|--------|
| **Free Tier** | $5 credit/month | Limited hours | 750 hours/month |
| **PostgreSQL** | ✅ Included | ✅ Addon | ✅ Separate service |
| **Auto Deploy** | ✅ Git integration | ✅ Git integration | ✅ Git integration |
| **Environment** | ✅ Easy setup | ✅ Easy setup | ✅ Easy setup |
| **Discord Bots** | ✅ Perfect | ✅ Good | ✅ Good |
| **Pricing** | $5/month after free | $7/month after free | $7/month after free |

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

#### **1. Bot Not Responding**
```bash
# Check logs
# Railway: railway logs
# Heroku: heroku logs --tail
# Render: Check service logs

# Verify environment variables are set
# Railway: railway variables
# Heroku: heroku config
# Render: Check environment tab
```

#### **2. Database Connection Issues**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌', err);
  else console.log('✅', res.rows[0]);
  pool.end();
});
"
```

#### **3. Commands Not Working**
```bash
# Redeploy commands
node scripts/deploy.js

# Check command registration
# Go to Discord Developer Portal → Your Application → Slash Commands
```

#### **4. Bot Offline**
- Check if the service is running
- Verify `DISCORD_TOKEN` is correct
- Check for errors in logs
- Ensure the bot has proper permissions

## 🎯 **RECOMMENDED WORKFLOW**

### **Development:**
1. Use SQLite locally (`DATABASE_URL=sqlite://./database/ravnspire.db`)
2. Test with `node index.js`
3. Deploy commands with `node scripts/deploy.js`

### **Production:**
1. Push code to GitHub
2. Deploy to Railway/Heroku/Render
3. Set environment variables
4. Deploy commands to production
5. Monitor logs for issues

## 🔐 **SECURITY NOTES**

- Never commit `.env` file to Git
- Use environment variables for all secrets
- Keep your Discord bot token secure
- Use guild-specific commands during development
- Switch to global commands for production

## 📈 **SCALING CONSIDERATIONS**

- **Railway**: Auto-scales, good for growing bots
- **Heroku**: Manual scaling, dyno limits
- **Render**: Auto-scales, good performance

For a Discord bot with your planned features, **Railway is the best choice** due to its simplicity and Discord bot optimization.
