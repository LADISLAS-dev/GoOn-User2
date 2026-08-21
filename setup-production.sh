#!/bin/bash

# Production Setup Initializer
# Helps prepare your app for production deployment

set -e

echo "🚀 Production Setup Initializer"
echo "================================\n"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============ STEP 1: Pre-flight checks ============
echo -e "${BLUE}Step 1: Pre-flight Checks${NC}\n"

if [ ! -f "frontend/app.json" ]; then
  echo -e "${RED}❌ frontend/app.json not found${NC}"
  exit 1
fi

if [ ! -d "backend" ]; then
  echo -e "${RED}❌ backend directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Project structure OK${NC}\n"

# ============ STEP 2: Check .env ============
echo -e "${BLUE}Step 2: Environment Configuration${NC}\n"

if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
  echo "Creating .env template..."
  
  cat > backend/.env << 'EOF'
# Production Configuration
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Security
JWT_SECRET=your-secret-key-here-change-this

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service.json

# Cloud Storage (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EOF
  
  echo -e "${YELLOW}⚠️  Created template at backend/.env${NC}"
  echo "   Please fill in your production values!"
else
  echo -e "${GREEN}✅ backend/.env exists${NC}"
fi

echo ""

# ============ STEP 3: Check app.json ============
echo -e "${BLUE}Step 3: EAS Configuration${NC}\n"

if grep -q '"projectId"' frontend/app.json; then
  echo -e "${GREEN}✅ EAS projectId configured${NC}"
else
  echo -e "${YELLOW}⚠️  EAS projectId missing${NC}"
  echo "   Run: eas init"
fi

if grep -q '"apiUrl"' frontend/app.json; then
  echo -e "${GREEN}✅ API URL configured${NC}"
else
  echo -e "${YELLOW}⚠️  Production API URL not set in app.json${NC}"
  echo "   Edit app.json > extra > apiUrl"
fi

echo ""

# ============ STEP 4: Summary ============
echo -e "${BLUE}Step 4: Next Steps${NC}\n"

echo "1. Update backend/.env with production values:"
echo "   - MONGODB_URI"
echo "   - JWT_SECRET"
echo "   - Firebase credentials"
echo ""

echo "2. Update frontend/app.json extra section:"
echo "   - apiUrl: https://your-production-api.com"
echo ""

echo "3. Test locally:"
echo "   cd backend && npm run dev"
echo "   node testProductionPush.js <username>"
echo ""

echo "4. Build for production:"
echo "   cd frontend"
echo "   eas build --platform ios --profile production"
echo "   eas build --platform android --profile production"
echo ""

echo "5. Install and test on device:"
echo "   cd ../backend"
echo "   node testProductionPush.js <username>"
echo ""

echo -e "${GREEN}✅ Setup ready!${NC}"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - README_PRODUCTION.md"
echo "   - PRODUCTION_NOTIFICATIONS.md"
echo ""
