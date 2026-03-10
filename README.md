# 🚀 LeadAI Pro — Deploy to Vercel

## Option 1: Deploy to Vercel (Recommended — FREE, 2 minutes)

### Step 1: Upload to GitHub
1. Go to https://github.com/new and create a new repository named `leadai-pro`
2. Download and install Git: https://git-scm.com
3. Open Terminal / Command Prompt in this folder and run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadai-pro.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to https://vercel.com and sign up with GitHub
2. Click **"Add New Project"**
3. Import your `leadai-pro` repository
4. Vercel auto-detects Vite — just click **"Deploy"**
5. ✅ Live in ~60 seconds at `https://leadai-pro.vercel.app`

---

## Option 2: Deploy to Netlify (FREE)

### Via Drag & Drop (easiest):
1. Run `npm run build` locally first (see Local Setup below)
2. Go to https://app.netlify.com/drop
3. Drag the `dist/` folder onto the page
4. ✅ Instantly live!

### Via GitHub:
1. Push to GitHub (same as Vercel Step 1)
2. Go to https://netlify.com → **"Add new site"** → **"Import from Git"**
3. Set build command: `npm run build`, publish directory: `dist`
4. Click **Deploy**

---

## Option 3: Local Development

### Requirements: Node.js 18+ (https://nodejs.org)

```bash
# 1. Open Terminal in this folder
cd leadai-pro

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open http://localhost:5173
```

### Build for production:
```bash
npm run build
# Output is in the dist/ folder — upload anywhere!
```

---

## 🔑 Setting Up API Keys (After Deployment)

1. Open your live site
2. Click **"API Keys"** in the sidebar
3. Add your key for:
   - **Claude**: https://console.anthropic.com → API Keys
   - **ChatGPT**: https://platform.openai.com → API Keys  
   - **Gemini**: https://aistudio.google.com → Get API Key
4. Click **"Set Active"** on your preferred provider
5. The AI will now generate personalized outreach messages!

---

## 💬 WhatsApp Setup

For real WhatsApp message sending (beyond the wa.me link):
- **Twilio**: https://www.twilio.com/en-us/whatsapp (easiest, pay-per-message)
- **WhatsApp Business API**: https://business.whatsapp.com/products/business-api

## ✉ Email Setup

For automated email sending:
- **Gmail**: Enable 2FA → Create App Password → use in Settings
- **SendGrid**: https://sendgrid.com (free 100 emails/day)

---

## 📁 Project Structure

```
leadai-pro/
├── src/
│   ├── App.jsx        ← Main app (all components)
│   └── main.jsx       ← React entry point
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
├── vercel.json        ← Vercel routing config
└── netlify.toml       ← Netlify build config
```
