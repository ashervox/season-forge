#!/bin/bash

# Claude-Alexa Bridge Quick Start Script

echo "🚀 Claude-Alexa Bridge Quick Start"
echo "===================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo ""
    echo "📝 Edit .env and add your ANTHROPIC_API_KEY"
    echo "   Get one from: https://console.anthropic.com/keys"
    echo ""
    read -p "Enter your API key (or press Enter to skip and edit .env manually): " api_key
    if [ -n "$api_key" ]; then
        sed -i.bak "s/your_api_key_here/$api_key/" .env
        rm .env.bak
        echo "✓ API key added to .env"
    else
        echo "⚠️  Please edit .env with your API key before starting"
    fi
else
    echo "✓ .env file exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your Anthropic API key is in .env"
echo "2. Run: npm start"
echo "3. In another terminal, run: npm run test-client"
echo ""
echo "For network setup with Echo device, see SETUP_GUIDE.md"
