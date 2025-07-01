import React from 'react';
import { createRoot } from 'react-dom/client';
import { WidgetAPI } from './api';
import { WidgetConfig } from './types';
import BookingForm from './components/BookingForm';

// Widget initialization and global interface
declare global {
  interface Window {
    TablebookingWidget: {
      init: (config: WidgetConfig) => void;
      destroy: (containerId: string) => void;
    };
  }
}

class TablebookingWidget {
  private static instances: Map<string, { root: any; api: WidgetAPI }> = new Map();

  static init(config: WidgetConfig) {
    const { containerId, apiKey, baseUrl = 'https://kind-benevolence-production.up.railway.app' } = config;
    
    // Find the container element
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`TablebookingWidget: Container element with id "${containerId}" not found`);
      return;
    }

    // Clean up existing instance if any
    this.destroy(containerId);

    try {
      // Create API instance
      const api = new WidgetAPI(baseUrl, apiKey);

      // Create React root and render
      const root = createRoot(container);
      
      // Load restaurant info to get theme
      api.getRestaurantInfo()
        .then(restaurantInfo => {
          root.render(
            <BookingForm 
              api={api} 
              theme={restaurantInfo.theme}
            />
          );
        })
        .catch(error => {
          console.error('TablebookingWidget: Failed to load restaurant info:', error);
          console.error('API Key:', apiKey);
          console.error('Base URL:', baseUrl);
          root.render(
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#f44336',
              border: '2px dashed #f44336',
              borderRadius: '8px',
              fontFamily: 'Arial, sans-serif'
            }}>
              <h3>Widget Loading Error</h3>
              <p>Failed to load widget configuration. Please refresh the page and try again.</p>
              <details style={{ marginTop: '10px', textAlign: 'left' }}>
                <summary>Technical Details</summary>
                <small>
                  <div>Error: {error.message}</div>
                  <div>API Key: {apiKey ? apiKey.substring(0, 8) + '...' : 'Missing'}</div>
                  <div>Base URL: {baseUrl}</div>
                </small>
              </details>
            </div>
          );
        });

      // Store instance for cleanup
      this.instances.set(containerId, { root, api });

      console.log(`TablebookingWidget: Initialized successfully for container "${containerId}"`);
    } catch (error) {
      console.error('TablebookingWidget: Initialization failed:', error);
    }
  }

  static destroy(containerId: string) {
    const instance = this.instances.get(containerId);
    if (instance) {
      try {
        instance.root.unmount();
        this.instances.delete(containerId);
        console.log(`TablebookingWidget: Destroyed instance for container "${containerId}"`);
      } catch (error) {
        console.error('TablebookingWidget: Error destroying instance:', error);
      }
    }
  }

  // Auto-initialize from data attributes
  static autoInit() {
    const widgets = document.querySelectorAll('[data-api-key]');
    widgets.forEach((element) => {
      const apiKey = element.getAttribute('data-api-key');
      const baseUrl = element.getAttribute('data-base-url');
      const containerId = element.id;

      if (apiKey && containerId) {
        this.init({
          containerId,
          apiKey,
          baseUrl: baseUrl || undefined
        });
      }
    });
  }
}

// Expose to global scope
if (typeof window !== 'undefined') {
  window.TablebookingWidget = {
    init: TablebookingWidget.init.bind(TablebookingWidget),
    destroy: TablebookingWidget.destroy.bind(TablebookingWidget)
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      TablebookingWidget.autoInit();
    });
  } else {
    // DOM is already ready
    TablebookingWidget.autoInit();
  }
}

export default TablebookingWidget;