// config.js - SIMPLE VERSION FOR DIRECT INJECTION
console.log('🚀 Loading configuration...');

// These values will be injected by GitHub Actions
window.SUPABASE_CONFIG = {
    URL: "",  // Will be filled by GitHub Actions
    ANON_KEY: "",  // Will be filled by GitHub Actions
    PAYPAL_CLIENT_ID: "",  // Will be filled by GitHub Actions
    ENV: 'production',
    DEBUG: true
};

console.log('✅ Config object created');
console.log('📊 Current config:', {
    url: window.SUPABASE_CONFIG.URL || 'Not set',
    key: window.SUPABASE_CONFIG.ANON_KEY ? 'Set (' + window.SUPABASE_CONFIG.ANON_KEY.length + ' chars)' : 'Not set',
    env: window.SUPABASE_CONFIG.ENV
});

// Validation function
window.validateConfig = function() {
    const config = window.SUPABASE_CONFIG;
    const isValid = config.URL && 
                   config.URL.startsWith('https://') && 
                   config.ANON_KEY && 
                   config.ANON_KEY.startsWith('eyJ');
    
    if (!isValid) {
        console.warn('⚠️ Config validation failed');
        config.FALLBACK_MODE = true;
    } else {
        config.FALLBACK_MODE = false;
        console.log('✅ Config validated successfully');
    }
    
    return {
        valid: isValid,
        fallback: config.FALLBACK_MODE,
        url: config.URL ? 'Present' : 'Missing',
        key: config.ANON_KEY ? 'Present' : 'Missing'
    };
};

// Auto-validate after a short delay
setTimeout(() => {
    console.log('🔍 Auto-validating config...');
    window.validateConfig();
}, 100);
