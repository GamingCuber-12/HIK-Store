// config.js - SIMPLIFIED VERSION
// Placeholders will be replaced by GitHub Actions

(function() {
    'use strict';
    
    console.log('🔐 Loading configuration...');
    
    // THESE WILL BE REPLACED BY GITHUB ACTIONS:
    const ENCRYPTED_URL = "%%ENCRYPTED_SUPABASE_URL%%";
    const ENCRYPTED_KEY = "%%ENCRYPTED_SUPABASE_KEY%%";
    const ENCRYPTED_PAYPAL = "%%ENCRYPTED_PAYPAL_CLIENT_ID%%";
    
    console.log('🔍 Checking injection status...');
    
    // Check if placeholders were replaced
    if (ENCRYPTED_URL.includes('%%ENCRYPTED_') || ENCRYPTED_KEY.includes('%%ENCRYPTED_')) {
        console.error('❌ GITHUB ACTIONS ERROR: Placeholders not replaced!');
        console.error('This means the deployment failed to inject secrets.');
        
        window.SUPABASE_CONFIG = {
            URL: null,
            ANON_KEY: null,
            FALLBACK_MODE: true,
            ERROR: 'GitHub Actions failed - placeholders still present',
            ENV: 'production'
        };
        
        console.log('📊 Fallback mode activated');
        return;
    }
    
    // Try to decode
    try {
        console.log('🔓 Decoding base64...');
        
        const decodedURL = atob(ENCRYPTED_URL);
        const decodedKey = atob(ENCRYPTED_KEY);
        
        // Basic validation
        if (!decodedURL.startsWith('https://')) {
            throw new Error('Decoded URL does not start with https://');
        }
        
        if (!decodedKey.startsWith('eyJ')) {
            throw new Error('Decoded key is not a valid JWT');
        }
        
        window.SUPABASE_CONFIG = {
            URL: decodedURL,
            ANON_KEY: decodedKey,
            PAYPAL_CLIENT_ID: ENCRYPTED_PAYPAL && !ENCRYPTED_PAYPAL.includes('%%') ? atob(ENCRYPTED_PAYPAL) : null,
            ENV: 'production',
            FALLBACK_MODE: false,
            DECODED: true
        };
        
        console.log('✅ Secrets decoded successfully!');
        console.log('🔗 URL valid:', decodedURL.startsWith('https://'));
        console.log('🔑 Key format:', decodedKey.startsWith('eyJ') ? 'JWT ✓' : 'Invalid');
        
    } catch (error) {
        console.error('❌ Decryption failed:', error.message);
        
        window.SUPABASE_CONFIG = {
            URL: null,
            ANON_KEY: null,
            FALLBACK_MODE: true,
            ERROR: 'Decryption failed: ' + error.message,
            ENV: 'production'
        };
    }
    
    // Debug function
    window.checkConfig = function() {
        const config = window.SUPABASE_CONFIG;
        return {
            urlPresent: !!config.URL,
            keyPresent: !!config.ANON_KEY,
            fallback: config.FALLBACK_MODE,
            decoded: config.DECODED || false,
            error: config.ERROR || 'None'
        };
    };
    
    console.log('📊 Config loaded:', window.checkConfig());
    
})();
