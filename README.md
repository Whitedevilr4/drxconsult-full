# Patient Counselling Web App - MVP

A web platform connecting patients with pharmacists for counselling sessions.

## Features
- Patient & Pharmacist authentication
- Booking system with time slots
- Payment integration (Razorpay)
- Google Meet integration
- Medical history management
- Document uploads & reports
- Dashboards for both user types

## Tech Stack
- Frontend: Next.js + React
- Backend: Node.js + Express
- Database: MongoDB
- Payments: Razorpay
- File Storage: Cloudinary
- Video: Google Meet API

## ⚠️ Login Issues? Run Setup Checker

If you're having trouble logging in:
```bash
# Windows
check_setup.bat

# Linux/Mac
./check_setup.sh
```

This will verify all configuration files and services are running correctly.

---

## 🚀 Quick Start (2 Steps)

1. **Seed Database:** 
```bash
cd backend
npm run seed:all
cd ..
```

2. **Start App:**
```bash
# Windows
start_app.bat

# Linux/Mac
./start_app.sh
```

**Login:** Use `admin`/`admin` (pharmacist) or `user`/`user` (patient)

The startup script automatically:
- ✅ Installs dependencies if needed
- ✅ Creates .env files from templates
- ✅ Checks MongoDB connection
- ✅ Starts both backend and frontend servers

See `QUICK_START.md` for detailed instructions.

---

## Startup Options

### Option 1: Complete Setup (First Time - Recommended)
Does everything including seeding:
```bash
# Windows
start_complete.bat

# Linux/Mac
./start_complete.sh
```

### Option 2: Quick Start (After Initial Setup)
Just starts the servers:
```bash
# Windows
start_app.bat

# Linux/Mac
./start_app.sh
```

### Option 3: Simple Mode (Separate Windows)
Opens backend and frontend in separate windows:
```bash
# Windows
start_simple.bat

# Linux/Mac
./start_simple.sh
```

### Manual Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
   - Update with your actual credentials

3. Start MongoDB (make sure it's running locally or use MongoDB Atlas)

4. Seed database with test accounts:
```bash
cd backend
npm run seed:all
```
This creates both test accounts (admin/user) and sample pharmacists.

5. Run development servers:
```bash
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:5000

## Demo Mode

The app works in demo mode with dummy data even without backend setup! Just start the frontend to explore features.

### Dummy Data Included:
- 6 sample pharmacists with avatars
- Sample bookings and appointments
- Demo dashboards for both patients and pharmacists
- Available time slots for booking

## Test Accounts

### Quick Test Accounts (Simple Login)
Run this command to create easy test accounts:
```bash
cd backend
npm run seed:test
```

**Admin Account (Pharmacist):**
- Email: `admin`
- Password: `admin`

**User Account (Patient):**
- Email: `user`
- Password: `user`

### Default Pharmacist Logins
After running `npm run seed`, you can login as:
- Email: sarah@example.com | Password: password123
- Email: michael@example.com | Password: password123
- Email: emily@example.com | Password: password123

## Project Structure
```
├── frontend/          # Next.js application
├── backend/           # Express API server
└── package.json       # Root package file
```
