#!/bin/bash
set -e
cd /var/www/social

PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx prisma generate
npm run build

# Copy static assets to standalone (required for Next.js standalone mode)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
cp -r node_modules/sharp .next/standalone/node_modules/ 2>/dev/null || true

pm2 restart social
echo 'Deploy complete'
