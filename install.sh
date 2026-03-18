#!/bin/bash
# ==============================================
# FitTrack PWA - One-command setup script
# Usage: bash install.sh
# ==============================================

set -e

echo ""
echo "🏋️  FitTrack PWA — Setup Script"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  echo "   Download: https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v) found"

# Check MongoDB
if command -v mongosh &> /dev/null; then
  if mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
    echo "✅ MongoDB is running"
  else
    echo "⚠️  MongoDB installed but not running"
    echo "   Try: brew services start mongodb-community (Mac)"
    echo "   Or:  sudo systemctl start mongod (Linux)"
    echo ""
    echo "   Attempting to start..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew services start mongodb-community 2>/dev/null || true
    else
      sudo systemctl start mongod 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo "⚠️  MongoDB not found"
  echo "   Download: https://www.mongodb.com/try/download/community"
  echo "   Mac: brew install mongodb-community"
  echo ""
fi

# Install npm dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🌱 Seeding database with demo data..."
npm run seed || echo "⚠️  Seed failed (MongoDB may not be running yet)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Start the app:"
echo "   npm run dev"
echo ""
echo "🌐 Then open: http://localhost:3000"
echo ""
echo "📱 Demo login:"
echo "   Email:    demo@fittrack.app"
echo "   Password: password123"
echo ""
echo "📖 Full docs: README.md"
echo ""
