// This runs on Vercel's server - users CANNOT see this code
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get order data from your checkout form
    const orderData = req.body;
    
    // ⚠️ YOUR SECRET KEY IS HERE (in Vercel dashboard, NOT in this code)
    const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY;
    
    if (!WEB3FORMS_KEY) {
      console.error('ERROR: WEB3FORMS_KEY not set in Vercel environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Validate required fields
    if (!orderData.customer_name || !orderData.customer_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Prepare data for Web3Forms
    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_KEY); // ✅ KEY IS HIDDEN HERE
    formData.append('subject', `New Order: ${orderData.order_id || 'HIK-ORDER'} - HIK Store UAE`);
    formData.append('from_name', orderData.customer_name);
    formData.append('email', orderData.customer_email);
    formData.append('phone', orderData.customer_phone || '');
    formData.append('order_id', orderData.order_id || 'HIK-ORDER');
    formData.append('total_amount', orderData.total_amount || 'AED 0');
    formData.append('shipping_address', orderData.shipping_address || '');
    formData.append('payment_method', orderData.payment_method || 'COD');
    
    // Your email (also set in Vercel environment)
    formData.append('to', process.env.YOUR_EMAIL || orderData.customer_email);
    formData.append('reply_to', orderData.customer_email);
    
    // Convert FormData to URLSearchParams
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      params.append(key, value);
    }
    
    // Forward to Web3Forms (your key is hidden)
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: params
    });
    
    const result = await response.json();
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Order received successfully',
        order_id: orderData.order_id
      });
    } else {
      console.error('Web3Forms error:', result);
      return res.status(500).json({ 
        error: 'Failed to send order',
        details: result.message 
      });
    }
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
