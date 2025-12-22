// admin/server.js (Node.js + Express)
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

// Use service role key from environment variable
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    
    // Verify JWT and check admin role
    // Implement your admin verification logic
    next()
}

// Admin routes
app.post('/admin/update-stock', requireAdmin, async (req, res) => {
    const { productId, newStock, adminId, reason } = req.body
    
    try {
        const { data, error } = await adminSupabase.rpc('update_product_stock', {
            p_product_id: productId,
            p_new_stock: newStock,
            p_user_id: adminId,
            p_reason: reason || 'admin_update'
        })
        
        if (error) throw error
        
        res.json({ success: true, data })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.get('/admin/analytics', requireAdmin, async (req, res) => {
    // Get analytics data
    const [
        productsCount,
        ordersCount,
        lowStockCount,
        salesData
    ] = await Promise.all([
        adminSupabase.from('products').select('id', { count: 'exact' }),
        adminSupabase.from('orders').select('id', { count: 'exact' }),
        adminSupabase.from('products').select('id').lt('stock', 10),
        adminSupabase.from('orders').select('total').gte('created_at', '2024-01-01')
    ])
    
    res.json({
        totalProducts: productsCount.count,
        totalOrders: ordersCount.count,
        lowStock: lowStockCount.length,
        totalSales: salesData.data.reduce((sum, order) => sum + order.total, 0)
    })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Admin server running on port ${PORT}`)
})
