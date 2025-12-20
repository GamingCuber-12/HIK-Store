// config.js - ENHANCED ENCRYPTED CONFIG
// DO NOT PUT REAL SECRETS HERE - Only placeholders
// GitHub Actions will replace these during deployment

(function() {
    'use strict';
    
    console.log('🔐 Loading encrypted configuration...');
    
    // ========== SECRET DECRYPTION ==========
    function decryptConfig() {
        const config = {
            URL: "%%ENCRYPTED_SUPABASE_URL%%",
            ANON_KEY: "%%ENCRYPTED_SUPABASE_KEY%%",
            PAYPAL_CLIENT_ID: "%%ENCRYPTED_PAYPAL_CLIENT_ID%%",
            ENV: 'production',
            VERSION: '2.0'
        };
        
        console.log('🔍 Checking GitHub Actions injection...');
        
        // Check if placeholders were replaced
        const hasPlaceholders = 
            config.URL.includes('%%ENCRYPTED_') ||
            config.ANON_KEY.includes('%%ENCRYPTED_');
        
        if (hasPlaceholders) {
            console.error('❌ GITHUB ACTIONS FAILED: Placeholders not replaced!');
            console.error('This means GitHub Actions did not inject your secrets.');
            console.error('Check: 1) GitHub Secrets are set 2) Actions workflow 3) Action logs');
            
            window.SUPABASE_CONFIG = {
                URL: null,
                ANON_KEY: null,
                FALLBACK_MODE: true,
                ERROR: 'GitHub Actions failed to inject secrets',
                ENV: 'production'
            };
            return;
        }
        
        // Try to decode base64
        try {
            console.log('🔓 Decoding base64 secrets...');
            
            const decodedURL = atob(config.URL);
            const decodedKey = atob(config.ANON_KEY);
            
            // Validate decoded values
            if (!decodedURL.startsWith('https://') || !decodedURL.includes('.supabase.co')) {
                throw new Error('Invalid Supabase URL after decoding');
            }
            
            if (!decodedKey.startsWith('eyJ')) {
                throw new Error('Invalid JWT format after decoding');
            }
            
            window.SUPABASE_CONFIG = {
                URL: decodedURL,
                ANON_KEY: decodedKey,
                PAYPAL_CLIENT_ID: config.PAYPAL_CLIENT_ID && !config.PAYPAL_CLIENT_ID.includes('%%') ? atob(config.PAYPAL_CLIENT_ID) : null,
                ENV: 'production',
                FALLBACK_MODE: false,
                DECODED_SUCCESS: true
            };
            
            console.log('✅ Secrets decrypted successfully!');
            console.log('🔗 URL valid:', window.SUPABASE_CONFIG.URL.startsWith('https://'));
            console.log('🔑 Key valid:', window.SUPABASE_CONFIG.ANON_KEY.length > 50);
            
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            console.error('Config URL (first 50 chars):', config.URL.substring(0, 50));
            console.error('Config Key (first 20 chars):', config.ANON_KEY.substring(0, 20));
            
            window.SUPABASE_CONFIG = {
                URL: null,
                ANON_KEY: null,
                FALLBACK_MODE: true,
                ERROR: 'Decryption failed: ' + error.message,
                ENV: 'production',
                RAW_URL: config.URL.substring(0, 50) + '...',
                RAW_KEY: config.ANON_KEY.substring(0, 20) + '...'
            };
        }
    }
    
    // Initialize
    decryptConfig();
    
    // Debug function
    window.debugConfig = function() {
        const config = window.SUPABASE_CONFIG;
        return {
            urlPresent: !!config.URL,
            urlValid: config.URL ? config.URL.startsWith('https://') && config.URL.includes('.supabase.co') : false,
            keyPresent: !!config.ANON_KEY,
            keyValid: config.ANON_KEY ? config.ANON_KEY.startsWith('eyJ') && config.ANON_KEY.length > 50 : false,
            fallbackMode: config.FALLBACK_MODE || false,
            error: config.ERROR || 'None',
            env: config.ENV,
            decoded: config.DECODED_SUCCESS || false
        };
    };
    
    console.log('📊 Config status:', window.debugConfig());
    
})();
