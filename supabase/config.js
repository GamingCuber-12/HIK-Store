// supabase/config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://xxxxxxxxxxxx.supabase.co'
const supabaseAnonKey = 'your-anon-key-here'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions
export async function getProducts(category = null) {
    let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    
    if (category && category !== 'all') {
        query = query.eq('category', category)
    }
    
    const { data, error } = await query
    
    if (error) {
        console.error('Error fetching products:', error)
        return []
    }
    
    return data
}

export async function addToCart(userId, productId, quantity = 1) {
    const { data, error } = await supabase
        .from('cart_items')
        .upsert(
            { user_id: userId, product_id: productId, quantity },
            { onConflict: 'user_id,product_id' }
        )
    
    return { success: !error, error }
}

export async function checkout(userId, items, shippingAddress) {
    const { data, error } = await supabase.rpc('process_order_checkout', {
        p_user_id: userId,
        p_items: items
    })
    
    return { success: !error, data, error }
}
