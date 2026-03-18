# 🏋️ FitTrack PWA — Complete Installation Guide

## What This App Does
FitTrack is a full-stack Progressive Web App (PWA) for fitness accountability:
- 📱 Mobile-first, installs to home screen on any phone
- 💪 Tracks 20+ exercises with sensor-based verification (accelerometer/gyroscope)
- 👥 Private/public accountability groups with leaderboards
- 🔥 Gamified streaks, XP, levels, and achievement badges
- 📲 One-tap WhatsApp daily report sharing
- 🔒 Anti-cheat engine with sensor fusion scoring
- 📊 Analytics charts (weekly/monthly)
- 🌐 Works offline with IndexedDB caching

---

## Prerequisites

Install these before starting:

1. **Node.js 18+**
   - Download from https://nodejs.org (choose LTS version)
   - Verify: `node --version` (should show v18+)

2. **MongoDB Community Server**
   - Download from https://www.mongodb.com/try/download/community
   - Install and start the service
   - Default runs on: `mongodb://127.0.0.1:27017`
   - **Windows**: Run MongoDB as a service (installer option)
   - **Mac**: `brew install mongodb-community && brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`
   - Verify: `mongosh --eval "db.adminCommand('ping')"` → should print `{ ok: 1 }`

3. **Git** (optional, for cloning)
   - https://git-scm.com/downloads

---

## Installation Steps

### Step 1 — Get the project

If you received a ZIP file:
```bash
unzip fittrack-pwa.zip
cd fittrack
```

Or if cloning from git:
```bash
git clone <repo-url> fittrack
cd fittrack
```

### Step 2 — Install dependencies
```bash
npm install
```
This installs Next.js, MongoDB/Mongoose, JWT, bcrypt, Recharts, Framer Motion, etc.
Takes 1-3 minutes depending on your connection.

### Step 3 — Configure environment
The `.env.local` file is already included with safe defaults.
No changes needed for local development.

If you want to customize:
```bash
# Edit .env.local
JWT_SECRET=your_custom_secret_here
MONGODB_URI=mongodb://127.0.0.1:27017/fittrack
```

### Step 4 — Generate PWA icons (optional)
```bash
# Only if you have node-canvas installed
npm install canvas --save-dev
node scripts/generate-icons.js
```
Or copy your own 192×192 and 512×512 PNG icons to `/public/icons/`

### Step 5 — Seed the database (optional but recommended)
```bash
npm run seed
```
Creates demo users:
- **Email**: demo@fittrack.app  
- **Password**: password123

### Step 6 — Start the development server
```bash
npm run dev
```
Open your browser: **http://localhost:3000**

---

## Using on Your Phone (PWA Install)

### Android (Chrome)
1. Open http://YOUR_COMPUTER_IP:3000 in Chrome on your phone
2. Tap the "..." menu → "Add to Home screen"
3. Tap "Install"

### iPhone (Safari)
1. Open http://YOUR_COMPUTER_IP:3000 in Safari
2. Tap the Share button (square with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap "Add"

### Find your computer's IP
- **Windows**: `ipconfig` → look for IPv4 Address
- **Mac/Linux**: `ifconfig` or `ip addr` → look for inet address
- Example: `http://192.168.1.105:3000`

> Note: Your phone and computer must be on the same WiFi network

---

## Production Build

For a production-ready build:
```bash
npm run build
npm start
```

This enables:
- Service Worker for offline caching
- PWA install prompt
- Optimized bundle

---

## Project Structure

```
fittrack/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # Backend API routes
│   │   │   ├── auth/           # Login, register, forgot password
│   │   │   ├── sessions/       # Workout sessions CRUD
│   │   │   ├── groups/         # Groups + leaderboard
│   │   │   ├── invitations/    # Join requests
│   │   │   ├── notifications/  # Push notifications
│   │   │   └── exercises/      # Analytics + daily report
│   │   ├── dashboard/          # Home screen
│   │   ├── workout/            # Active workout tracker
│   │   ├── groups/             # Groups list + detail
│   │   ├── analytics/          # Charts & stats
│   │   ├── profile/            # Settings & badges
│   │   ├── login/              # Auth pages
│   │   └── register/
│   ├── components/
│   │   ├── ui/                 # Shared UI components
│   │   └── notifications/      # Notification panel
│   ├── hooks/
│   │   ├── useSensors.ts       # Accelerometer/gyroscope/GPS
│   │   ├── useWorkoutTimer.ts  # Session timer
│   │   └── useApi.ts           # Authenticated fetch hook
│   ├── lib/
│   │   ├── db/connect.ts       # MongoDB connection
│   │   ├── models/             # Mongoose schemas
│   │   └── utils/              # Auth, exercises, verification engine
│   ├── store/
│   │   ├── authStore.ts        # Zustand auth state
│   │   └── workoutStore.ts     # Active session state
│   └── types/index.ts          # TypeScript interfaces
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # App icons
├── .env.local                  # Environment config
├── next.config.js              # Next.js + PWA config
└── tailwind.config.js          # Design system
```

---

## Key Features Explained

### Sensor Verification
The app uses your phone's accelerometer and gyroscope to detect exercise repetitions.
During a workout:
- Place phone as directed (e.g., beside hand for push-ups)
- The motion sensor detects each rep automatically
- OR tap the "TAP" button manually for each rep
- Verification score (0-100) calculated from motion consistency, rep patterns, and duration

### Anti-Cheat System
- Random prompts appear during workout (wave, clap, etc.)
- Score below 60 = unverified (still saved, just marked)
- Score 60+ = verified workout ✅

### Groups & Privacy
- **Private groups**: Only members can see activity, leaderboard, notifications
- **Public groups**: Appear in directory; joining requires request (or auto-accept)
- Admin can generate invite codes, approve members, start challenges

### WhatsApp Sharing
Tap "Share Daily Report" after any workout to open WhatsApp with a pre-filled summary message. No API key needed — uses the standard `wa.me` URL scheme.

---

## Troubleshooting

**MongoDB connection fails?**
```bash
# Check if MongoDB is running
mongosh
# If error, start it:
# Mac: brew services start mongodb-community
# Windows: net start MongoDB
# Linux: sudo systemctl start mongod
```

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001
# Then visit http://localhost:3001
```

**Sensors not working on phone?**
- iOS requires Safari (not Chrome) for sensor access
- iOS 13+ shows a permission dialog — tap "Allow"
- Sensors work over HTTPS or localhost only

**npm install fails?**
```bash
# Try clearing cache
npm cache clean --force
npm install
```

**Build fails with PWA error?**
```bash
# Disable PWA for development (already set in next.config.js)
# Make sure NODE_ENV=development in .env.local
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| State | Zustand |
| Offline | IndexedDB (idb) |
| Charts | Recharts |
| Animations | Framer Motion |
| UI | TailwindCSS |
| PWA | next-pwa + Service Worker |
| Sensors | Web DeviceMotion API |
| Fonts | Syne (display) + DM Sans (body) |

---

## Demo Login
After running `npm run seed`:

```
Email:    demo@fittrack.app
Password: password123
```

---

Built with ❤️ — Full production-ready PWA, no external paid APIs.
