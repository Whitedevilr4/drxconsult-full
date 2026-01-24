#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Patient Counselling Web App - Startup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check if MongoDB is running
check_mongodb() {
    if command -v mongod &> /dev/null; then
        if pgrep -x "mongod" > /dev/null; then
            echo "✓ MongoDB is running"
            return 0
        else
            echo "⚠️  MongoDB is not running"
            echo "   Start it with: sudo systemctl start mongod"
            echo "   Or: brew services start mongodb-community (Mac)"
            return 1
        fi
    else
        echo "⚠️  MongoDB not found. Using MongoDB Atlas or remote connection?"
        return 0
    fi
}

# Check if node_modules exists
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "   Installing dependencies..."
    npm run install-all
    echo "   ✓ Dependencies installed"
else
    echo "   ✓ Dependencies already installed"
fi
echo ""

# Check if .env files exist
echo "⚙️  Checking environment files..."
if [ ! -f "backend/.env" ]; then
    echo "   Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "   ⚠️  Please edit backend/.env with your credentials"
else
    echo "   ✓ backend/.env exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "   Creating frontend/.env.local from template..."
    cp frontend/.env.local.example frontend/.env.local
    echo "   ⚠️  Please edit frontend/.env.local with your credentials"
else
    echo "   ✓ frontend/.env.local exists"
fi
echo ""

# Check MongoDB
echo "🗄️  Checking database..."
check_mongodb
echo ""

# Check if database is seeded
echo "🌱 Checking database seed..."
if [ -f "backend/.env" ]; then
    # Try to check if users exist (this is optional)
    echo "   Run 'cd backend && npm run seed:all' if you need test accounts"
    echo "   Test accounts: admin/admin (pharmacist) and user/user (patient)"
else
    echo "   ⚠️  Configure backend/.env first, then run: cd backend && npm run seed:all"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Starting servers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🔧 Backend API:  http://localhost:5000"
echo "   🌐 Frontend:     http://localhost:3000"
echo ""
echo "   📝 Test Accounts:"
echo "      Admin: admin / admin (Pharmacist)"
echo "      User:  user / user (Patient)"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start servers (use plain mode to avoid nodemon issues)
npm run dev:plain
