// netlify/functions/create-order.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // SECURE: Keys are in Netlify environment, not in code
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }
    
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const orderData = JSON.parse(event.body);
        
        // Basic validation
        if (!orderData.customer_email || !orderData.total_amount) {
            throw new Error('Invalid order data: missing email or total');
        }
        
        // Generate order details
        const orderNumber = 'HIK' + Date.now().toString(36).toUpperCase();
        const trackingNumber = 'DX' + Math.random().toString(36).substr(2, 9).toUpperCase() + 'AE';
        
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                ...orderData,
                order_number: orderNumber,
                tracking_number: trackingNumber,
                order_status: 'processing',
                payment_status: orderData.payment_method === 'cod' ? 'pending' : 'paid',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                order_id: data.id,
                order_number: orderNumber,
                tracking_number: trackingNumber,
                message: 'Order created successfully'
            })
        };
        
    } catch (error) {
        console.error('Function error:', error);
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
