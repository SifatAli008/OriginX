#!/bin/bash
# Script to check Vercel deployment status

echo "=== Vercel Deployment Status Check ==="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI is not installed"
    echo "   Install with: npm install -g vercel"
    exit 1
fi

echo "✓ Vercel CLI is installed"
echo ""

# Check if project is linked
if [ -f ".vercel/project.json" ]; then
    echo "✓ Project is linked to Vercel"
    cat .vercel/project.json
    echo ""
else
    echo "⚠️  Project is not linked to Vercel"
    echo "   Run: vercel link"
    echo ""
fi

# Check recent deployments (requires authentication)
echo "Checking recent deployments..."
echo ""

# Note: This requires VERCEL_TOKEN to be set
if [ -n "$VERCEL_TOKEN" ]; then
    vercel ls --token="$VERCEL_TOKEN" 2>&1 | head -10
else
    echo "⚠️  VERCEL_TOKEN not set"
    echo "   Set it or run: vercel login"
fi

echo ""
echo "=== Check Complete ==="

