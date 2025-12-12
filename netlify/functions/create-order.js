// netlify/functions/create-order.js - SAFE VERSION 1
exports.handler = async (event) => {
    console.log('🛡️ Function called safely');
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: 'OK'
        };
    }
    
    // For now, just return success (testing phase)
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: true,
            message: '✅ Function is working!',
            mode: 'TESTING',
            timestamp: new Date().toISOString()
        })
    };
};
