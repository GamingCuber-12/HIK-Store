// netlify/functions/create-order.js - SIMPLIFIED (No dependencies)
exports.handler = async (event, context) => {
    console.log('Function invoked:', new Date().toISOString());
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        
        console.log('Environment check:', {
            url: supabaseUrl ? 'Set' : 'Missing',
            key: supabaseKey ? 'Set (hidden)' : 'Missing'
        });
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables');
        }
        
        // Parse request body
        let orderData;
        try {
            orderData = JSON.parse(event.body);
            console.log('Order received for:', orderData.customer_email);
        } catch (parseError) {
            throw new Error('Invalid JSON in request body');
        }
        
        // Validate required fields
        if (!orderData.customer_email || !orderData.total_amount) {
            throw new Error('Missing required fields: customer_email and total_amount');
        }
        
        // Generate order details
        const orderNumber = 'HIK' + Date.now().toString(36).toUpperCase();
        const trackingNumber = 'DX' + Math.random().toString(36).substr(2, 9).toUpperCase() + 'AE';
        
        // Prepare order for database
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Saving order to Supabase:', orderNumber);
        
        // Use native fetch to save to Supabase (no dependencies needed!)
        const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([dbOrder])
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('Supabase API error:', response.status, responseText);
            throw new Error(`Supabase error: ${response.status} - ${responseText}`);
        }
        
        let savedOrder;
        try {
            savedOrder = JSON.parse(responseText);
        } catch (e) {
            savedOrder = [{ id: 'unknown' }];
        }
        
        console.log('Order saved successfully:', savedOrder[0]?.id);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Order created successfully',
                order_id: savedOrder[0]?.id,
                order_number: orderNumber,
                tracking_number: trackingNumber,
                total_amount: orderData.total_amount
            })
        };
        
    } catch (error) {
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Internal server error'
            })
        };
    }
};
