#!/bin/bash

echo "🚀 Setting up Git repository for Restaurant Booking Platform"

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Restaurant booking platform with admin panel"

echo "✅ Git repository initialized!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run the following commands:"
echo ""
echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""
echo "Then follow the deployment guide in DEPLOYMENT.md"