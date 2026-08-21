#!/bin/bash

# Production Configuration Checker
# Verify that your app is correctly configured for production builds

echo "🔍 Production Configuration Checker\n"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============ FRONTEND CHECKS ============
echo "==== FRONTEND CONFIGURATION ====\n"

# Check app.json
if [ -f "frontend/app.json" ]; then
  if grep -q '"projectId"' frontend/app.json; then
    check_pass "EAS projectId configured in app.json"
  else
    check_fail "EAS projectId missing in app.json"
  fi
else
  check_fail "app.json not found"
fi

# Check eas.json
if [ -f "frontend/eas.json" ]; then
  if grep -q '"production"' frontend/eas.json; then
    check_pass "Production profile configured in eas.json"
  else
    check_warn "Production profile not configured in eas.json"
  fi
else
  check_warn "eas.json not found (optional for development)"
fi

# Check env.js has API URL
if grep -q "https://" frontend/env.js; then
  check_pass "Production API URL configured in env.js"
else
  check_warn "No HTTPS API URL in env.js (might use Expo Go defaults)"
fi

# ============ BACKEND CHECKS ============
echo "\n==== BACKEND CONFIGURATION ====\n"

# Check .env file
if [ -f "backend/.env" ]; then
  check_pass ".env file exists"
  
  if grep -q "NODE_ENV=production" backend/.env; then
    check_pass "NODE_ENV=production configured"
  else
    check_warn "NODE_ENV not set to production (currently: development)"
  fi
  
  if grep -q "MONGODB_URI=" backend/.env && [ ! -z "$(grep 'MONGODB_URI=' backend/.env | cut -d= -f2)" ]; then
    check_pass "MongoDB URI configured"
  else
    check_fail "MongoDB URI missing"
  fi
  
  if grep -q "JWT_SECRET=" backend/.env && [ ! -z "$(grep 'JWT_SECRET=' backend/.env | cut -d= -f2)" ]; then
    check_pass "JWT_SECRET configured"
  else
    check_fail "JWT_SECRET missing"
  fi
  
  if grep -q "FIREBASE_SERVICE_ACCOUNT_PATH=" backend/.env || grep -q "FIREBASE_PROJECT_ID=" backend/.env; then
    check_pass "Firebase configuration detected"
  else
    check_warn "Firebase configuration missing (check if using env variables)"
  fi
else
  check_fail ".env file missing"
fi

# ============ NOTIFICATION SYSTEM ============
echo "\n==== NOTIFICATION SYSTEM ====\n"

if [ -f "backend/utils/expoPush.js" ]; then
  check_pass "Expo Push utilities found"
else
  check_fail "Expo Push utilities missing"
fi

if [ -f "backend/utils/pushTokenSelection.js" ]; then
  check_pass "Token selection utilities found"
else
  check_fail "Token selection utilities missing"
fi

# ============ DEPLOYMENT READY ============
echo "\n==== DEPLOYMENT READINESS ====\n"

if grep -q "\"version\":" frontend/app.json; then
  VERSION=$(grep '"version"' frontend/app.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
  check_pass "App version set: $VERSION"
fi

if [ -f "backend/package.json" ]; then
  if grep -q '"main":' backend/package.json; then
    check_pass "Backend entry point configured"
  fi
else
  check_fail "Backend package.json missing"
fi

# ============ RECOMMENDATIONS ============
echo "\n==== RECOMMENDATIONS FOR PRODUCTION ====\n"

echo "1. Frontend Build:"
echo "   eas build --platform ios --profile production"
echo "   eas build --platform android --profile production"
echo ""

echo "2. Submit to App Stores:"
echo "   eas submit --platform ios"
echo "   eas submit --platform android"
echo ""

echo "3. After Installation, Verify:"
echo "   node backend/testProductionPush.js <username>"
echo "   node backend/diagnosePush.js"
echo ""

echo "4. Monitor Production:"
echo "   Check MongoDB for notification status"
echo "   Tail backend logs for push errors"
echo ""

echo "✅ Configuration check complete!"
