// netlify/functions/create-order.js - SUPER SIMPLE
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }
    
    // Only POST allowed
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Method not allowed' }) 
        };
    }
    
    try {
        // Your Supabase credentials
        const SUPABASE_URL = 'https://bsrmuspemiwyoajaoczu.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzcm11c3BlbWl3eW9hamFvY3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MjM2OTcsImV4cCI6MjA4MDg4MzY5N30.foL_ysYCJwE18mljCKY6KO5pNebbAcBK23z8jzkMiho';
        
        // Parse order data
        const order = JSON.parse(event.body);
        
        // Generate order details
        const orderNumber = 'HIK' + Date.now().toString(36).toUpperCase();
        const trackingNumber = 'DX' + Math.random().toString(36).substr(2, 9).toUpperCase() + 'AE';
        
        // Create database record
        const dbOrder = {
            order_number: orderNumber,
            tracking_number: trackingNumber,
            customer_name: order.customer_name || 'Customer',
            customer_email: order.customer_email,
            customer_phone: order.customer_phone || '',
            shipping_address: order.shipping_address || '',
            shipping_city: order.shipping_city || '',
            shipping_emirate: order.shipping_emirate || '',
            total_amount: order.total_amount,
            payment_method: order.payment_method || 'cod',
            order_status: 'processing',
            created_at: new Date().toISOString()
        };
        
        // Save to Supabase
        const response = await fetch(SUPABASE_URL + '/rest/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            },
            body: JSON.stringify([dbOrder])
        });
        
        if (!response.ok) {
            throw new Error('Database error: ' + response.status);
        }
        
        // Success
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                order_number: orderNumber,
                tracking_number: trackingNumber
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
