// netlify/functions/create-order.js
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // 1. SECURITY: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // 2. SECURITY: Basic origin check (optional but recommended)
  const allowedOrigin = 'https://your-website.netlify.app'; // Replace with your site URL
  const requestOrigin = event.headers.origin || event.headers.referer;
  
  if (!requestOrigin || !requestOrigin.includes(allowedOrigin)) {
    console.warn('⚠️ Potential unauthorized request from:', requestOrigin);
    // You can choose to return an error or just log it
    // return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  try {
    // 3. Parse the order data sent from checkout.html
    const orderData = JSON.parse(event.body);
    
    // 4. Generate unique IDs
    const orderId = `HIK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const trackingId = `TRK-UAE-${Date.now().toString(36).toUpperCase()}`;
    
    const completeOrder = {
      order_id: orderId,
      tracking_id: trackingId,
      timestamp: new Date().toISOString(),
      ip_address: event.headers['client-ip'] || 'unknown',
      ...orderData
    };

    // 5. Save order to a JSON file (as a simple database)
    const ordersDir = path.join('/tmp', 'orders');
    try {
      await fs.mkdir(ordersDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    const filePath = path.join(ordersDir, `${orderId}.json`);
    await fs.writeFile(filePath, JSON.stringify(completeOrder, null, 2), 'utf8');
    
    console.log(`✅ Order saved: ${orderId}`);

    // 6. Send email notification to you
    await sendOrderEmail(completeOrder);

    // 7. Return success response to checkout.html
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin // Important for CORS
      },
      body: JSON.stringify({
        success: true,
        order_number: orderId,
        tracking_number: trackingId,
        message: 'Order received successfully'
      })
    };

  } catch (error) {
    console.error('❌ Order processing error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error. Please contact support.'
      })
    };
  }
};

// Email function using Gmail
async function sendOrderEmail(order) {
  try {
    // Configure your Gmail (create an App Password: https://myaccount.google.com/apppasswords)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Set in Netlify dashboard
        pass: process.env.GMAIL_APP_PASSWORD // Set in Netlify dashboard
      }
    });

    // Format order details for email
    const itemsText = order.order_items.map(item => 
      `  - ${item.product_name} (Qty: ${item.quantity}) - AED ${item.product_price}`
    ).join('\n');

    const mailOptions = {
      from: `"HIK Store UAE" <${process.env.GMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL || process.env.GMAIL_USER, // Email to yourself
      subject: `🛍️ New HIK Store Order: ${order.order_id}`,
      html: `
        <h2>New Order Received</h2>
        <p><strong>Order ID:</strong> ${order.order_id}</p>
        <p><strong>Tracking:</strong> ${order.tracking_id}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Email:</strong> ${order.customer_email}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Shipping:</strong> ${order.shipping_address}, ${order.shipping_city}, ${order.shipping_emirate}</p>
        
        <h3>Order Items:</h3>
        <pre>${itemsText}</pre>
        
        <h3>Payment Summary:</h3>
        <p>Subtotal: AED ${order.subtotal}</p>
        <p>Shipping: AED ${order.shipping_fee}</p>
        <p>Tax: AED ${order.tax_amount}</p>
        <p><strong>Total: AED ${order.total_amount}</strong></p>
        
        <p><strong>Payment Method:</strong> ${order.payment_method}</p>
        <p><em>Order received at: ${new Date(order.timestamp).toLocaleString('en-AE')}</em></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent for order: ${order.order_id}`);
    
  } catch (emailError) {
    console.error('Failed to send email:', emailError);
    // Don't fail the whole order if email fails
  }
}
