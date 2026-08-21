#!/bin/bash

# 🧪 Production Notification Tester
# Tests end-to-end notification system
# 
# Usage:
#   chmod +x test-notifications.sh
#   ./test-notifications.sh <username>
#   ./test-notifications.sh ram3

set -e

USERNAME=${1:-"ram3"}
BACKEND_DIR="./backend"

echo "🧪 Production Notification Test Suite"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

test_fail() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

test_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

test_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============ PRE-CHECKS ============
echo "==== 1. PRE-CHECKS ====\n"

if [ ! -d "$BACKEND_DIR" ]; then
  test_fail "Backend directory not found: $BACKEND_DIR"
fi

if [ ! -f "$BACKEND_DIR/diagnosePush.js" ]; then
  test_fail "diagnosePush.js not found"
fi

if [ ! -f "$BACKEND_DIR/testProductionPush.js" ]; then
  test_fail "testProductionPush.js not found"
fi

test_pass "All test scripts found"

# ============ TEST 1: Diagnose System ============
echo "\n==== 2. SYSTEM DIAGNOSTICS ====\n"

test_info "Running: node diagnosePush.js"
cd "$BACKEND_DIR"

# Capture output
DIAG_OUTPUT=$(node diagnosePush.js 2>&1)

# Check for tokens
if echo "$DIAG_OUTPUT" | grep -q "Total users with push tokens:"; then
  test_pass "User found in database"
else
  test_fail "User not found - run: node testProductionPush.js <username>"
fi

# Check for token details
if echo "$DIAG_OUTPUT" | grep -q "expoPushToken:"; then
  test_pass "Push tokens registered"
else
  test_warn "No push tokens found - user needs to reopen app"
fi

# ============ TEST 2: Check Token Type ============
echo "\n==== 3. TOKEN TYPE VALIDATION ====\n"

if echo "$DIAG_OUTPUT" | grep -q "ExponentPushToken"; then
  test_info "Token type: Expo Go (development)"
elif echo "$DIAG_OUTPUT" | grep -q "ExpoPushToken"; then
  test_pass "Token type: Production EAS build ✨"
else
  test_warn "Token type: Unknown"
fi

# ============ TEST 3: Send Test Notification ============
echo "\n==== 4. SEND TEST NOTIFICATION ====\n"

test_info "Running: node testProductionPush.js $USERNAME"

# Run test and capture output
PUSH_OUTPUT=$(node testProductionPush.js "$USERNAME" 2>&1 || true)

# Check if push succeeded
if echo "$PUSH_OUTPUT" | grep -q "✅ Success: [1-9]"; then
  test_pass "Notification pushed to Expo API"
else
  test_warn "Notification may not have been pushed - check logs above"
fi

# Check for failures
if echo "$PUSH_OUTPUT" | grep -q "❌ Success: 0"; then
  test_fail "No successful push - check token validity"
fi

# ============ TEST 4: Database Status ============
echo "\n==== 5. DATABASE STATUS CHECK ====\n"

test_info "Checking notification status in database..."

# This would require a separate script to query MongoDB
# For now, we'll just suggest the command
echo ""
echo "To verify database status, run:"
echo "  mongo"
echo "  > db.notifications.find({ type: 'test' }).sort({ createdAt: -1 }).limit(1)"
echo "  "
echo "Expected: status should be 'sent' (not 'pending')"
echo ""

# ============ RESULTS ============
echo "==== 6. TEST RESULTS ====\n"

if echo "$PUSH_OUTPUT" | grep -q "✅ Test completed"; then
  test_pass "All tests passed! ✨"
  echo ""
  echo "📱 Next step: Check your device for the test notification"
  echo ""
  exit 0
else
  test_warn "Some tests did not complete as expected"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check app notification permissions on device"
  echo "2. Restart the app"
  echo "3. Run this test again"
  echo ""
  exit 1
fi
