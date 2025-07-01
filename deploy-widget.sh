#!/bin/bash

echo "🔨 Building widget..."
cd widget
npm run build

echo "📁 Copying widget to backend..."
mkdir -p ../backend/public/widget
cp dist/widget.js ../backend/public/widget/

echo "🚀 Deploying to Railway..."
cd ../backend
git add public/widget/
git commit -m "Update: Deploy latest widget build

- Built embeddable booking widget with React
- Added date/time picker with availability checking
- Integrated with public API endpoints
- Applied theme customization from widget config
- Ready for production use

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Widget deployed! Available at:"
echo "https://kind-benevolence-production.up.railway.app/widget.js"
echo ""
echo "🎯 Live Demo:"
echo "https://kind-benevolence-production.up.railway.app/demo"
echo ""
echo "📝 Integration example:"
echo "<!-- Add this to any website -->"
echo "<script src=\"https://kind-benevolence-production.up.railway.app/widget.js\"></script>"
echo "<div id=\"booking-widget\" data-api-key=\"YOUR_API_KEY\"></div>"
echo "<script>"
echo "  TablebookingWidget.init({"
echo "    containerId: 'booking-widget',"
echo "    apiKey: 'YOUR_API_KEY'"
echo "  });"
echo "</script>"