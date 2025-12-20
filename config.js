// config.js - Runtime configuration loader
(function() {
    console.log('🔐 Secure config loader initialized');
    
    // Check if we're in development (local) vs production (GitHub Pages)
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        // Development: Use environment variables or hardcoded for local testing
        // These should be set in your local environment
        window.SUPABASE_CONFIG = {
            URL: process.env.SUPABASE_URL || "https://demo-supabase-url.supabase.co",
            ANON_KEY: process.env.SUPABASE_ANON_KEY || "demo-key-only-for-local-testing"
        };
        console.log('🛠️ Development mode: Using local/placeholder config');
    } else {
        // Production: Keys will be injected securely at build time
        // Placeholder - will be replaced by GitHub Actions
        window.SUPABASE_CONFIG = {
            URL: "%%SUPABASE_URL%%",
            ANON_KEY: "%%SUPABASE_ANON_KEY%%"
        };
    }
})();
