# 🗺️ AI Data Center Tracker

An interactive map tracking AI data centers across the United States — operational facilities and those under construction — powered by **Next.js**, **Leaflet**, and **Claude AI**.

![AI Data Center Tracker](https://img.shields.io/badge/Built%20with-Next.js%2014-black?logo=next.js) ![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet-orange) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## Features

- 🗺️ **Interactive Leaflet map** with custom markers sized by MW capacity
- 🟢 **Operational** vs 🟡 **Under Construction** status with color-coded markers
- 🔍 **Filter by US State** — click any state abbreviation in the sidebar
- 📊 **Filter by status** — All / Operational / Under Construction
- 🔎 **Search** by name, company, or city
- 💬 **Claude AI chat panel** — ask anything about AI infrastructure
- ⚡ **"Ask Claude" button** on each map popup for instant facility insights
- 📍 **30 tracked facilities** across 16+ states with capacity data

---

## Data Coverage

Companies tracked: Microsoft, Google, Amazon, Meta, xAI, OpenAI/Stargate, CoreWeave, Oracle, NVIDIA, IBM, Equinix, Switch, Databricks, Anthropic

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/ai-datacenter-map
cd ai-datacenter-map
npm install
```

### 2. Add your Claude API key

Open `src/pages/api/chat.js` and replace the placeholder:

```js
const ANTHROPIC_API_KEY = "sk-ant-YOUR-KEY-HERE";
```

> ⚠️ **Never commit your real API key to a public repo.** For production, use Vercel environment variables instead (see below).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B — GitHub Integration

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import your repo
3. Add environment variable `ANTHROPIC_API_KEY` in Vercel dashboard
4. Update `src/pages/api/chat.js` to use `process.env.ANTHROPIC_API_KEY` instead of hardcoded value
5. Deploy!

---

## Using Environment Variables (Recommended for Production)

Instead of hardcoding the key, update `src/pages/api/chat.js`:

```js
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
```

Then in Vercel dashboard → Settings → Environment Variables, add:
- Key: `ANTHROPIC_API_KEY`  
- Value: `sk-ant-your-key-here`

---

## Project Structure

```
ai-datacenter-map/
├── src/
│   ├── pages/
│   │   ├── _app.js          # App wrapper, fonts, Leaflet CSS
│   │   ├── index.js         # Main page — map + sidebar + chat
│   │   └── api/
│   │       └── chat.js      # Claude API proxy (serverless function)
│   ├── data/
│   │   └── datacenters.js   # Dataset of 30 AI data centers
│   └── styles/
│       └── globals.css      # Full design system
├── public/                  # Static assets
├── next.config.js
├── vercel.json
├── package.json
└── README.md
```

---

## Adding More Data Centers

Edit `src/data/datacenters.js` and add an entry:

```js
{
  id: 31,
  name: "Your Data Center Name",
  company: "Company Name",
  city: "City",
  state: "TX",           // 2-letter state code
  lat: 30.2672,
  lng: -97.7431,
  status: "operational", // "operational" | "under_construction"
  capacity_mw: 300,
  year: 2025,
  description: "Brief description of the facility.",
  tags: ["Tag1", "Tag2"],
}
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 | React framework + API routes |
| Leaflet 1.9 | Interactive map (free, OpenStreetMap tiles) |
| Claude API | AI chat for infrastructure questions |
| Vercel | Hosting & serverless functions |
| CSS Variables | Design system & dark theme |

---

## License

MIT
