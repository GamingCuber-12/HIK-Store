// config.js - MAIN CONFIG FILE
// This will be OVERWRITTEN by GitHub Actions

console.log('⚙️ Loading config.js...');

// This is a TEMPORARY placeholder
// GitHub Actions will REPLACE this entire file
window.SUPABASE_CONFIG = {
  URL: "",
  ANON_KEY: "",
  PAYPAL_CLIENT_ID: "",
  ENV: 'development',
  INJECTED: false,
  ERROR: 'Waiting for GitHub Actions to inject secrets'
};

console.log('⚠️ Config not yet injected by GitHub Actions');
console.log('This file will be replaced during deployment');

// Debug function
window.showConfig = function() {
  alert(
    'Supabase Config:\n\n' +
    'URL: ' + (window.SUPABASE_CONFIG.URL || 'NOT SET') + '\n' +
    'Key: ' + (window.SUPABASE_CONFIG.ANON_KEY ? 'SET (' + window.SUPABASE_CONFIG.ANON_KEY.length + ' chars)' : 'NOT SET') + '\n' +
    'Injected: ' + (window.SUPABASE_CONFIG.INJECTED ? 'YES ✅' : 'NO ⚠️') + '\n' +
    'Error: ' + (window.SUPABASE_CONFIG.ERROR || 'None')
  );
};
