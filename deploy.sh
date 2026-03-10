#!/bin/bash

echo ""
echo "  ========================================"
echo "   LeadAI Pro — Vercel Deployment Script"
echo "  ========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Check Node
if ! command -v node &> /dev/null; then
  echo -e "  ${RED}[ERROR]${NC} Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Node.js: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "  ${RED}[ERROR]${NC} npm not found."
  exit 1
fi
echo -e "  ${GREEN}[OK]${NC} npm: $(npm -v)"

echo ""
echo -e "  ${CYAN}Step 1/4:${NC} Installing dependencies..."
npm install
if [ $? -ne 0 ]; then echo -e "  ${RED}[ERROR]${NC} npm install failed"; exit 1; fi
echo -e "  ${GREEN}[OK]${NC} Dependencies installed"

echo ""
echo -e "  ${CYAN}Step 2/4:${NC} Building production bundle..."
npm run build
if [ $? -ne 0 ]; then echo -e "  ${RED}[ERROR]${NC} Build failed"; exit 1; fi
echo -e "  ${GREEN}[OK]${NC} Build complete → dist/ folder"

echo ""
echo -e "  ${CYAN}Step 3/4:${NC} Installing Vercel CLI..."
npm install -g vercel
if [ $? -ne 0 ]; then echo -e "  ${RED}[ERROR]${NC} Vercel CLI install failed"; exit 1; fi
echo -e "  ${GREEN}[OK]${NC} Vercel CLI ready"

echo ""
echo -e "  ${CYAN}Step 4/4:${NC} Deploying to Vercel..."
echo -e "  ${BOLD}(A browser will open — log in with GitHub or Google)${NC}"
echo ""
vercel --prod

echo ""
echo -e "  ${GREEN}========================================"
echo -e "   ✅  Deployment Complete!"
echo -e "   Your LeadAI Pro is LIVE on Vercel!"
echo -e "  ========================================${NC}"
echo ""
