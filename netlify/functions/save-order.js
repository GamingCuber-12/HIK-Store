// netlify/functions/save-order.js
const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event) => {
  // 1. SECURITY: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    // 2. Parse the order data
    const order = JSON.parse(event.body);
    
    // 3. Generate order IDs
    const orderId = `HIK-${Date.now().toString(36).toUpperCase()}`;
    const trackingId = `TRK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    // 4. Prepare data for Google Sheets
    const sheetData = {
      'Order ID': orderId,
      'Tracking ID': trackingId,
      'Date': new Date().toLocaleString('en-AE'),
      'Customer Name': order.customer_name,
      'Customer Email': order.customer_email,
      'Customer Phone': order.customer_phone,
      'Shipping Address': order.shipping_address,
      'Shipping City': order.shipping_city,
      'Shipping Emirate': order.shipping_emirate,
      'Delivery Instructions': order.delivery_instructions || 'None',
      'Subtotal': `AED ${order.subtotal.toFixed(2)}`,
      'Shipping Fee': order.shipping_fee === 0 ? 'FREE' : `AED ${order.shipping_fee.toFixed(2)}`,
      'Tax': `AED ${order.tax_amount.toFixed(2)}`,
      'Total': `AED ${order.total_amount.toFixed(2)}`,
      'Payment Method': order.payment_method === 'cod' ? 'Cash on Delivery' : 
                       order.payment_method === 'card' ? 'Credit Card' : 
                       order.payment_method,
      'Items Count': order.order_items.reduce((sum, item) => sum + item.quantity, 0),
      'Items List': order.order_items.map(item => 
        `${item.quantity}x ${item.product_name}`).join(', '),
      'Status': '🟡 New Order'
    };

    // 5. Save to Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    // Use service account authentication (more secure than API keys)
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow(sheetData);
    
    console.log(`✅ Order saved to Google Sheets: ${orderId}`);

    // 6. Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        order_number: orderId,
        tracking_number: trackingId,
        message: 'Order received successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error saving order:', error);
    
    // Still return order IDs even if Sheets fails
    const orderId = `HIK-${Date.now().toString(36).toUpperCase()}`;
    const trackingId = `TRK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    return {
      statusCode: 200, // Still 200 so checkout page shows confirmation
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        order_number: orderId,
        tracking_number: trackingId,
        message: 'Order received (offline mode)',
        warning: 'Please manually record this order'
      })
    };
  }
};
