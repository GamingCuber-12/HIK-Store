// netlify/functions/create-order.js - FIXED CORS VERSION
exports.handler = async (event, context) => {
    console.log('🔧 Function called:', event.httpMethod);
    
    // Set CORS headers for ALL responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request - MUST RETURN 200
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight OK' })
        };
    }
    
    // Only process POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed. Use POST.' 
            })
        };
    }
    
    try {
        console.log('📦 Processing order...');
        
        // Parse request body
        let orderData;
        try {
            orderData = JSON.parse(event.body);
            console.log('📧 Order for:', orderData.customer_email);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON data'
                })
            };
        }
        
        // Validate required fields
        if (!orderData.customer_email || !orderData.total_amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields: email and total amount'
                })
            };
        }
        
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing env vars');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error'
                })
            };
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
        
        console.log('💾 Saving to Supabase...');
        
        // Save to Supabase using fetch
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([dbOrder])
        });
        
        const responseText = await supabaseResponse.text();
        
        if (!supabaseResponse.ok) {
            console.error('❌ Supabase error:', supabaseResponse.status, responseText);
            return {
                statusCode: supabaseResponse.status,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: `Database error: ${supabaseResponse.status}`,
                    details: responseText.substring(0, 200)
                })
            };
        }
        
        console.log('✅ Order saved successfully:', orderNumber);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Order created successfully',
                order_number: orderNumber,
                tracking_number: trackingNumber,
                total_amount: orderData.total_amount,
                customer_email: orderData.customer_email
            })
        };
        
    } catch (error) {
        console.error('🔥 Function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Server error: ' + error.message
            })
        };
    }
};
