import { Router } from 'express';
import { WIDGET_JS_CONTENT, WIDGET_METADATA } from '../widget-content';
import { widgetFileRateLimit, demoRateLimit } from '../middleware/widgetRateLimit';

const router = Router();

// Serve the widget JavaScript file from memory
router.get('/widget.js', widgetFileRateLimit, (req, res) => {
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Widget-Version', WIDGET_METADATA.version);
  
  res.send(WIDGET_JS_CONTENT);
});

// Widget demo page
router.get('/demo', demoRateLimit, (req, res) => {
  const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TableBooking Widget Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .demo-section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        h2 { color: #666; }
        .widget-container {
            border: 2px dashed #ddd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            background: #fafafa;
        }
        .note {
            background: #e3f2fd;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="demo-section">
        <h1>🍽️ TableBooking Widget Demo</h1>
        <p>This page demonstrates how the booking widget appears on restaurant websites.</p>
        
        <div class="note">
            <strong>Note:</strong> This is a live demo running on Railway.
        </div>
    </div>

    <div class="demo-section">
        <h2>📅 Book a Table</h2>
        <p>The widget below connects to our demo restaurant:</p>
        
        <div class="widget-container">
            <div id="tablebooking-widget"></div>
        </div>
    </div>

    <div class="demo-section">
        <h2>🔧 Integration Code</h2>
        <p>Restaurants add this code to their website:</p>
        <pre style="background: #f0f0f0; padding: 15px; border-radius: 4px; overflow-x: auto;"><code>&lt;!-- TableBooking Widget --&gt;
&lt;script src="https://${req.get('host')}/widget.js"&gt;&lt;/script&gt;
&lt;div id="tablebooking-widget" data-api-key="YOUR_API_KEY"&gt;&lt;/div&gt;
&lt;script&gt;
  TablebookingWidget.init({
    containerId: 'tablebooking-widget',
    apiKey: 'YOUR_API_KEY'
  });
&lt;/script&gt;</code></pre>
    </div>

    <!-- Load the widget script -->
    <script src="/widget.js"></script>
    <script>
        // Demo widget initialization
        setTimeout(() => {
            console.log('Initializing TablebookingWidget...');
            if (window.TablebookingWidget) {
                window.TablebookingWidget.init({
                    containerId: 'tablebooking-widget',
                    apiKey: 'DEMO_API_KEY_REPLACE_WITH_ACTUAL',
                    baseUrl: window.location.origin
                });
            } else {
                console.error('TablebookingWidget not found');
            }
        }, 500);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(demoHtml);
});

export default router;