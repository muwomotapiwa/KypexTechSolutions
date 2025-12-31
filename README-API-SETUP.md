# Secure API Key Setup Guide - Netlify Functions

This guide explains how to securely configure your Gemini API key using Netlify Functions.

## 🔐 Why This Matters

Previously, the API key was exposed in client-side JavaScript, visible to anyone viewing the page source. Now, the key is stored securely server-side in Netlify environment variables.

## 📋 Quick Setup Steps

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key (starts with `AIzaSy...`)

### 2. Configure Netlify Environment Variable

#### Option A: Via Netlify Dashboard (Recommended)

1. Log in to [Netlify](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (paste the key you copied)
   - **Scopes**: Select all deploy contexts (Production, Deploy Previews, Branch deploys)
6. Click **Create variable**

#### Option B: Via Netlify CLI

```bash
netlify env:set GEMINI_API_KEY "your_actual_api_key_here"
```

### 3. Deploy Your Site

#### First-Time Setup

```bash
# Install dependencies
npm install

# Deploy to Netlify
netlify deploy --prod
```

#### Subsequent Deployments

Just push to your Git repository - Netlify will auto-deploy if connected to Git.

## 🧪 Local Development

### 1. Create Local Environment File

```bash
# Copy the example file
copy .env.example .env
```

### 2. Edit `.env` File

Open `.env` and add your API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: Never commit the `.env` file to Git! It's already in `.gitignore`.

### 3. Run Locally with Netlify Dev

```bash
# Install Netlify CLI globally (one-time)
npm install -g netlify-cli

# Start local development server
netlify dev
```

This will:
- Load environment variables from `.env`
- Run Netlify Functions locally
- Serve your site at `http://localhost:8888`

## 📁 Files Created

| File | Purpose |
|------|---------|
| `netlify.toml` | Netlify configuration |
| `netlify/functions/gemini.js` | Serverless function (API proxy) |
| `package.json` | Node.js dependencies |
| `.env.example` | Environment variable template |
| `.gitignore` | Prevents committing sensitive files |
| `js/agent.js` | Updated to use Netlify function |

## 🔍 How It Works

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │────────▶│ Netlify Function │────────▶│  Gemini API │
│ (agent.js)  │         │  (gemini.js)     │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
                              ▲
                              │
                        API Key stored
                        securely here
```

1. User interacts with the chat agent in their browser
2. `agent.js` sends request to `/api/gemini` (Netlify function)
3. Netlify function reads `GEMINI_API_KEY` from environment variables
4. Function forwards request to Google's Gemini API with the key
5. Response is sent back to the browser

**The API key never reaches the browser!**

## ✅ Verification

### Test the Function Locally

```bash
# Start Netlify dev server
netlify dev

# In another terminal, test the function
curl -X POST http://localhost:8888/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Test on Production

1. Open your deployed site
2. Click the AI chat button
3. Type a message
4. If you get a response, it's working! ✅

### Check Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Send a chat message
4. Look for the request to `/api/gemini`
5. Verify the API key is NOT visible in the request

## 🚨 Troubleshooting

### "Server configuration error"

**Cause**: `GEMINI_API_KEY` environment variable is not set.

**Fix**: 
1. Check Netlify dashboard → Site settings → Environment variables
2. Ensure `GEMINI_API_KEY` is set correctly
3. Redeploy the site

### "Network issue" in chat

**Cause**: Netlify function is not deployed or has errors.

**Fix**:
1. Check Netlify function logs: Site → Functions → gemini
2. Verify `netlify/functions/gemini.js` exists
3. Ensure `package.json` includes `node-fetch` dependency
4. Redeploy

### Local development not working

**Cause**: `.env` file missing or incorrect.

**Fix**:
1. Ensure `.env` file exists in project root
2. Check that `GEMINI_API_KEY` is set in `.env`
3. Restart `netlify dev`

## 🔒 Security Best Practices

✅ **Do:**
- Store API key in Netlify environment variables
- Keep `.env` file in `.gitignore`
- Rotate API keys periodically
- Monitor API usage in Google Cloud Console

❌ **Don't:**
- Commit `.env` file to Git
- Share API keys in chat/email
- Use the same key across multiple projects
- Expose keys in client-side code

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🆘 Need Help?

If you encounter issues:
1. Check Netlify function logs
2. Verify environment variable is set
3. Test locally with `netlify dev`
4. Check browser console for errors
