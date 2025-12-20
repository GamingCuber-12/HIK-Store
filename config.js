// config.js - MANUAL SECURE CONFIG
// This file contains NO SECRETS - only validation

console.log('🔐 Secure config loader v3');

// ==================== ENVIRONMENT DETECTION ====================
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
const isDevelopment = window.location.hostname.includes('dev') ||
                      window.location.hostname.includes('local') ||
                      window.location.protocol === 'file:';

// ==================== CONFIGURATION ====================
window.SUPABASE_CONFIG = {
  // These will be populated by the loader
  URL: null,
  ANON_KEY: null,
  PAYPAL_CLIENT_ID: null,
  ENV: isLocalhost ? 'local' : isDevelopment ? 'dev' : 'production',
  LOADED: false,
  SOURCE: 'unknown'
};

// ==================== LOAD SECURE CONFIG ====================
function loadSecureConfig() {
  console.log('🔄 Loading secure configuration...');
  
  // Method 1: Check if GitHub Actions injected via window.SUPABASE_CONFIG_INJECTED
  if (window.SUPABASE_CONFIG_INJECTED) {
    console.log('✅ Using injected config from build process');
    Object.assign(window.SUPABASE_CONFIG, window.SUPABASE_CONFIG_INJECTED);
    window.SUPABASE_CONFIG.SOURCE = 'github-actions';
    window.SUPABASE_CONFIG.LOADED = true;
    return;
  }
  
  // Method 2: Try to load from a secure endpoint (for future use)
  fetch('/api/config', { 
    method: 'GET',
    headers: { 'X-Config-Request': 'true' },
    cache: 'no-cache'
  })
  .then(response => {
    if (response.ok) return response.json();
    throw new Error('Config endpoint not available');
  })
  .then(config => {
    console.log('✅ Loaded config from secure endpoint');
    Object.assign(window.SUPABASE_CONFIG, config);
    window.SUPABASE_CONFIG.SOURCE = 'secure-endpoint';
    window.SUPABASE_CONFIG.LOADED = true;
  })
  .catch(() => {
    // Method 3: Fallback - use environment detection
    console.log('⚠️ Using environment-based fallback');
    
    // For GitHub Pages production, we expect secrets to be inlined by build process
    // If they're not there, we'll work in fallback mode
    window.SUPABASE_CONFIG.SOURCE = 'fallback';
    window.SUPABASE_CONFIG.FALLBACK_MODE = true;
    window.SUPABASE_CONFIG.LOADED = true;
    
    // Try to extract from meta tags (if added by build process)
    const metaUrl = document.querySelector('meta[name="supabase-url"]');
    const metaKey = document.querySelector('meta[name="supabase-key"]');
    
    if (metaUrl && metaKey) {
      window.SUPABASE_CONFIG.URL = metaUrl.getAttribute('content');
      window.SUPABASE_CONFIG.ANON_KEY = metaKey.getAttribute('content');
      window.SUPABASE_CONFIG.FALLBACK_MODE = false;
      window.SUPABASE_CONFIG.SOURCE = 'meta-tags';
      console.log('✅ Found config in meta tags');
    }
  });
}

// ==================== VALIDATION ====================
function validateConfig() {
  const config = window.SUPABASE_CONFIG;
  
  if (!config.URL || !config.ANON_KEY) {
    config.VALID = false;
    config.FALLBACK_MODE = true;
    config.ERROR = 'Missing Supabase configuration';
    console.warn('⚠️ Supabase config missing - using fallback mode');
    return false;
  }
  
  if (!config.URL.startsWith('https://')) {
    config.VALID = false;
    config.FALLBACK_MODE = true;
    config.ERROR = 'Invalid Supabase URL (must use HTTPS)';
    console.error('❌ Invalid Supabase URL');
    return false;
  }
  
  if (!config.ANON_KEY.startsWith('eyJ')) {
    config.VALID = false;
    config.FALLBACK_MODE = true;
    config.ERROR = 'Invalid Supabase key format';
    console.error('❌ Invalid Supabase key format');
    return false;
  }
  
  config.VALID = true;
  config.FALLBACK_MODE = false;
  config.ERROR = null;
  console.log('✅ Config validated successfully');
  return true;
}

// ==================== INITIALIZATION ====================
(function init() {
  console.log('🚀 Initializing secure config system');
  
  // Start loading
  loadSecureConfig();
  
  // Validate after a short delay
  setTimeout(() => {
    validateConfig();
    
    // Log final status
    console.log('📊 Config Status:', {
      source: window.SUPABASE_CONFIG.SOURCE,
      valid: window.SUPABASE_CONFIG.VALID || false,
      fallback: window.SUPABASE_CONFIG.FALLBACK_MODE || false,
      url: window.SUPABASE_CONFIG.URL ? 'Present' : 'Missing',
      key: window.SUPABASE_CONFIG.ANON_KEY ? 'Present' : 'Missing',
      env: window.SUPABASE_CONFIG.ENV,
      error: window.SUPABASE_CONFIG.ERROR || 'None'
    });
    
    // Dispatch event for other scripts
    window.dispatchEvent(new CustomEvent('supabase-config-loaded', {
      detail: window.SUPABASE_CONFIG
    }));
    
  }, 300);
})();

// ==================== PUBLIC API ====================
window.getSupabaseConfig = function() {
  return { ...window.SUPABASE_CONFIG };
};

window.isSupabaseAvailable = function() {
  return window.SUPABASE_CONFIG.VALID && !window.SUPABASE_CONFIG.FALLBACK_MODE;
};

window.debugConfig = function() {
  const config = window.SUPABASE_CONFIG;
  return {
    url: config.URL ? '✓ Present' : '✗ Missing',
    key: config.ANON_KEY ? '✓ Present' : '✗ Missing',
    valid: config.VALID ? '✅ Valid' : '❌ Invalid',
    fallback: config.FALLBACK_MODE ? '✅ Yes' : '❌ No',
    source: config.SOURCE,
    error: config.ERROR || 'None',
    env: config.ENV
  };
};
