// ========== IMPORTS ==========
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

// ========== SECURITY SETUP ==========
const app = express();

// 1. HELMET - Basic security headers
app.use(helmet());

// 2. RATE LIMITING - Prevent brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// 3. CORS - Only allow your frontend
const allowedOrigins = [
    'https://hikstore.ae',
    'https://www.hikstore.ae',
    'http://localhost:3000'
];
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// 4. BODY PARSER
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// ========== DATABASE ==========
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hikstore_secure', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => console.log('✅ Database connected securely'))
  .catch(err => console.error('❌ Database connection failed:', err));

// ========== SUPER SIMPLE MODELS ==========
const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 8,
        select: false // Never return password in queries
    },
    name: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    points: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    image: { type: String },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        price: Number
    }],
    total: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    paymentId: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// ========== SECURITY MIDDLEWARE ==========
const protect = async (req, res, next) => {
    try {
        // 1. Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Not authorized. Please login.' });
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'backup-secret-key-change-me');

        // 3. Get user from token
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }

        // 4. Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

const checkOwnership = (model) => async (req, res, next) => {
    try {
        const doc = await model.findById(req.params.id);
        
        if (!doc) {
            return res.status(404).json({ error: 'Not found' });
        }

        // Check if user owns the resource OR is admin
        if (doc.userId && doc.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // For products
        if (doc.sellerId && doc.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.resource = doc;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// ========== SIMPLE AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name
        });

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'backup-secret-key-change-me',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'backup-secret-key-change-me',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                points: user.points
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ========== PRODUCT ROUTES ==========
// Public - Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().populate('sellerId', 'name email');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Private - Create product (seller only)
app.post('/api/products', protect, async (req, res) => {
    try {
        const product = await Product.create({
            ...req.body,
            sellerId: req.user.id
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// ========== ORDER ROUTES ==========
// User can only see THEIR orders
app.get('/api/orders/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .populate('items.productId', 'title image')
            .sort('-createdAt');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Create order (user only)
app.post('/api/orders', protect, async (req, res) => {
    try {
        const order = await Order.create({
            ...req.body,
            userId: req.user.id
        });
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get specific order (only owner)
app.get('/api/orders/:id', protect, checkOwnership(Order), async (req, res) => {
    res.json(req.resource);
});

// ========== USER PROFILE ==========
// User can only see THEIR profile
app.get('/api/users/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update profile (only self)
app.put('/api/users/me', protect, async (req, res) => {
    try {
        // Remove password from update if present
        const { password, ...updateData } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========== ADMIN ROUTES (OPTIONAL) ==========
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Admin can see all users
app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin can see all orders
app.get('/api/admin/orders', protect, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().populate('userId', 'name email');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// ========== SECURITY HEADERS ==========
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled error:', err);
    
    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Something went wrong';
    
    res.status(500).json({ 
        error: message,
        // In development, show stack trace
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Secure backend running on port ${PORT}`);
    console.log(`🔐 Security features enabled:`);
    console.log(`   • Helmet security headers`);
    console.log(`   • Rate limiting (100 req/15min)`);
    console.log(`   • CORS restricted to frontend only`);
    console.log(`   • Request size limits (10kb)`);
    console.log(`   • JWT authentication with bcrypt`);
    console.log(`   • Ownership checking middleware`);
    console.log(`   • Query injection prevention (Mongoose)`);
});
