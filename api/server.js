const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Save order endpoint
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Generate order ID
    const orderId = 'HIK' + Date.now().toString().slice(-8);
    const trackingNumber = 'DX' + Math.random().toString(36).substr(2, 9).toUpperCase() + 'AE';
    
    // Save to database
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
        order_items: orderData.items,
        subtotal: orderData.totals.subtotal,
        shipping_fee: orderData.totals.shipping,
        total_amount: orderData.totals.total,
        payment_method: orderData.payment_method,
        tracking_number: trackingNumber,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      order_id: orderId,
      tracking_number: trackingNumber,
      message: 'Order saved successfully'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

// Get all orders (for admin viewing)
app.get('/api/orders', async (req, res) => {
  try {
    // Add secret key check for security
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, orders: data });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.listen(3000, () => console.log('API running on port 3000'));
