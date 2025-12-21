export default {
  async fetch(request, env) {
    // 1. Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      // 2. Get data from your checkout form
      const data = await request.json();
      
      // 3. ⚠️ YOUR KEY IS HERE (in Cloudflare dashboard, NOT in code)
      const formData = new FormData();
      formData.append('access_key', env.WEB3FORMS_KEY); // HIDDEN KEY
      formData.append('subject', `New Order: ${data.order_id} - HIK Store UAE`);
      formData.append('from_name', data.customer_name);
      formData.append('email', data.customer_email);
      formData.append('phone', data.customer_phone || '');
      formData.append('order_id', data.order_id || 'HIK-ORDER');
      formData.append('total_amount', data.total_amount || 'AED 0');
      formData.append('to', data.customer_email); // Sends to customer
      formData.append('reply_to', data.customer_email);
      
      // 4. Forward to Web3Forms (key is hidden)
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });
      
      // 5. Return the response
      return response;
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Server error',
        message: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
