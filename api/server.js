const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://gamingcuber-12.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Rate limiting: 10 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.'
});
app.use('/api/orders', limiter);

// Initialize Supabase with server key (NOT visible to users)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email transporter (using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Validate order data
function validateOrderData(orderData) {
  const required = ['customer', 'shipping', 'items', 'totals'];
  for (const field of required) {
    if (!orderData[field]) return false;
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(orderData.customer.email)) return false;
  
  // Validate phone
  const phoneRegex = /^[0-9+-\s]{7,20}$/;
  if (!phoneRegex.test(orderData.customer.phone)) return false;
  
  return true;
}

// Main order endpoint
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate request
    if (!validateOrderData(orderData)) {
      return res.status(400).json({ error: 'Invalid order data' });
    }
    
    // Generate tracking number
    const trackingNumber = `DX${Date.now().toString(36).toUpperCase()}AE`;
    const orderId = `HIK${Date.now().toString().slice(-8)}`;
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        order_id: orderId,
        customer_name: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
        customer_email: orderData.customer.email,
        customer_phone: orderData.customer.phone,
        shipping_address: orderData.shipping.address,
        shipping_city: orderData.shipping.city,
        shipping_emirate: orderData.shipping.emirate,
        shipping_country: orderData.shipping.country,
        order_items: orderData.items,
        subtotal: orderData.totals.subtotal,
        shipping_fee: orderData.totals.shipping,
        total_amount: orderData.totals.total,
        payment_method: orderData.payment_method,
        tracking_number: trackingNumber,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Send confirmation emails
    await Promise.all([
      sendAdminEmail(orderData, orderId, trackingNumber),
      sendCustomerEmail(orderData, orderId, trackingNumber)
    ]);
    
    // Clear cart on frontend (signal)
    res.json({
      success: true,
      order_id: orderId,
      tracking_number: trackingNumber,
      clear_cart: true,
      message: 'Order placed successfully!'
    });
    
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ 
      error: 'Order processing failed', 
      details: error.message 
    });
  }
});

// Admin email (to you)
async function sendAdminEmail(orderData, orderId, trackingNumber) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `📦 NEW ORDER #${orderId} - HIK Store UAE`,
    html: `
      <h2>🚀 NEW ORDER RECEIVED!</h2>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Tracking:</strong> ${trackingNumber}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString('en-AE')}</p>
      
      <h3>👤 Customer Details</h3>
      <p><strong>Name:</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
      <p><strong>Email:</strong> ${orderData.customer.email}</p>
      <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
      
      <h3>📍 Shipping Address</h3>
      <p>${orderData.shipping.address}</p>
      <p>${orderData.shipping.city}, ${orderData.shipping.emirate}</p>
      <p>${orderData.shipping.country}</p>
      
      <h3>🛒 Order Items</h3>
      ${orderData.items.map(item => `
        <div style="border-bottom:1px solid #eee;padding:10px 0;">
          <p><strong>${item.title}</strong> x${item.quantity}</p>
          <p>Price: AED ${item.price} × ${item.quantity} = AED ${item.price * item.quantity}</p>
        </div>
      `).join('')}
      
      <h3>💰 Order Summary</h3>
      <p><strong>Subtotal:</strong> AED ${orderData.totals.subtotal}</p>
      <p><strong>Shipping:</strong> AED ${orderData.totals.shipping}</p>
      <p><strong>Total:</strong> AED ${orderData.totals.total}</p>
      <p><strong>Payment Method:</strong> ${orderData.payment_method}</p>
      
      <hr>
      <p>📱 <strong>Take Action:</strong></p>
      <p>1. Prepare order for shipping</p>
      <p>2. Update tracking on Aramex</p>
      <p>3. Contact customer if needed</p>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

// Customer email
async function sendCustomerEmail(orderData, orderId, trackingNumber) {
  const mailOptions = {
    from: `HIK Store UAE <${process.env.EMAIL_USER}>`,
    to: orderData.customer.email,
    subject: `✅ Order Confirmation #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #0066FF;">Thank you for your order! 🎉</h2>
        
        <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p><strong>Estimated Delivery:</strong> 2-3 business days</p>
        </div>
        
        <h3>Your Order Details</h3>
        ${orderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
            <div>
              <p style="margin: 0;"><strong>${item.title}</strong></p>
              <p style="margin: 0; color: #666;">Quantity: ${item.quantity}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0;">AED ${item.price * item.quantity}</p>
            </div>
          </div>
        `).join('')}
        
        <div style="margin-top: 20px;">
          <p><strong>Subtotal:</strong> AED ${orderData.totals.subtotal}</p>
          <p><strong>Shipping:</strong> ${orderData.totals.shipping === 0 ? 'FREE' : `AED ${orderData.totals.shipping}`}</p>
          <p><strong>Total:</strong> <strong style="color: #0066FF;">AED ${orderData.totals.total}</strong></p>
        </div>
        
        <div style="background: #e8f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>📦 Shipping Information</h4>
          <p>${orderData.shipping.address}<br>
          ${orderData.shipping.city}, ${orderData.shipping.emirate}<br>
          ${orderData.shipping.country}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://gamingcuber-12.github.io/HIK-Store/Client.html" 
             style="background: #0066FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Continue Shopping
          </a>
        </div>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Need help? WhatsApp us at +971 50 123 4567 or reply to this email.
        </p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
