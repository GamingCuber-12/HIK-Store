// netlify/functions/create-order.js - NO DEPENDENCIES VERSION
exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS request (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
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
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Server configuration error');
        }
        
        // Parse request
        const orderData = JSON.parse(event.body);
        
        // Generate order details
        const orderNumber = 'HIK' + Date.now().toString(36).toUpperCase();
        const trackingNumber = 'DX' + Math.random().toString(36).substr(2, 9).toUpperCase() + 'AE';
        
        // Create order object
        const dbOrder = {
            order_number: orderNumber,
            tracking_number: trackingNumber,
            customer_name: orderData.customer_name || 'Customer',
            customer_email: orderData.customer_email,
            customer_phone: orderData.customer_phone || '',
            shipping_address: orderData.shipping_address || '',
            shipping_city: orderData.shipping_city || '',
            shipping_emirate: orderData.shipping_emirate || '',
            shipping_postal_code: orderData.shipping_postal_code || '',
            delivery_instructions: orderData.delivery_instructions || '',
            order_items: orderData.order_items || [],
            subtotal: orderData.subtotal || 0,
            shipping_fee: orderData.shipping_fee || 0,
            tax_amount: orderData.tax_amount || 0,
            total_amount: orderData.total_amount,
            payment_method: orderData.payment_method || 'cod',
            payment_status: orderData.payment_method === 'cod' ? 'pending' : 'paid',
            order_status: 'processing',
            marketing_consent: orderData.marketing_consent || false,
            created_at: new Date().toISOString()
        };
        
        // Save to Supabase using native fetch (no dependencies!)
        const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify([dbOrder])
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Database error: ${response.status}`);
        }
        
        // Success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                order_number: orderNumber,
                tracking_number: trackingNumber,
                message: 'Order created successfully'
            })
        };
        
    } catch (error) {
        // Error response
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Server error'
            })
        };
    }
};
