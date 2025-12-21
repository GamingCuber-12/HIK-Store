// This runs on Vercel's server - users can't see this code
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your SECRET Web3Forms key (set as environment variable)
    const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY;
    
    // Extract form data from request
    const { order_id, customer_name, customer_email, customer_phone, 
            shipping_address, shipping_city, shipping_emirate, 
            payment_method, total_amount, order_items } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Forward to Web3Forms with your hidden key
    const web3formsResponse = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,  // ← KEY IS HIDDEN HERE
        subject: `New Order: ${order_id} - HIK Store UAE`,
        from_name: customer_name,
        email: customer_email,
        phone: customer_phone,
        order_id: order_id,
        total_amount: total_amount,
        shipping_address: `${shipping_address}, ${shipping_city}, ${shipping_emirate}`,
        payment_method: payment_method,
        order_items: order_items,
        to: process.env.YOUR_EMAIL || 'your-email@gmail.com',
        reply_to: customer_email
      })
    });

    const result = await web3formsResponse.json();

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        order_id: order_id,
        message: 'Order received successfully' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to process order',
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
