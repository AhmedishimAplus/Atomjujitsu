const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all purchases with filters
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, owner, paymentMethod } = req.query;
        const query = {};

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Payment method filter
        if (paymentMethod) {
            query.paymentMethod = paymentMethod;
        }

        let purchases = await Purchase.find(query)
            .populate('adminId', 'username')
            .populate({
                path: 'products.productId',
                select: 'name owner sellPrice'
            })
            .sort({ createdAt: -1 });

        // Filter by owner if specified
        if (owner) {
            purchases = purchases.filter(purchase =>
                purchase.products.some(product => 
                    product.productId.owner === owner
                )
            );
        }

        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate total for selected products
router.post('/calculate-total', [
    auth,
    body('products').isArray().withMessage('Products must be an array'),
    body('products.*.productId').notEmpty().withMessage('Product ID is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const productsDetails = [];
        let total = 0;

        // Calculate total and get product details
        for (const item of req.body.products) {
            const product = await Product.findById(item.productId).select('name sellPrice');
            
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            if (!product.sellPrice || typeof product.sellPrice !== 'number') {
                return res.status(400).json({ error: `Invalid price for product ${product.name}` });
            }

            const itemTotal = Number((product.sellPrice * item.quantity).toFixed(2));
            
            productsDetails.push({
                name: product.name,
                sellPrice: product.sellPrice,
                quantity: item.quantity,
                itemTotal
            });

            total += itemTotal;
        }

        res.json({
            products: productsDetails,
            total: Number(total.toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new purchase
router.post('/', [
    auth,
    body('products').isArray().withMessage('Products must be an array'),
    body('products.*.productId').notEmpty().withMessage('Product ID is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('paymentMethod').isIn(['cash', 'instapay']).withMessage('Invalid payment method'),
    body('transactionId').custom((value, { req }) => {
        if (req.body.paymentMethod === 'instapay' && !value) {
            throw new Error('Transaction ID is required for InstaPay payments');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let total = 0;
        const productsWithPrices = [];

        // Process each product
        for (const item of req.body.products) {
            const product = await Product.findById(item.productId).select('name sellPrice stock isAvailable');
            
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            
            if (!product.isAvailable) {
                return res.status(400).json({ 
                    error: `Product ${product.name} is not available`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}`
                });
            }

            if (!product.sellPrice || typeof product.sellPrice !== 'number') {
                return res.status(400).json({ error: `Invalid price for product ${product.name}` });
            }

            const itemTotal = Number((product.sellPrice * item.quantity).toFixed(2));
            
            // Update stock
            product.stock -= item.quantity;
            await product.save();

            productsWithPrices.push({
                productId: item.productId,
                quantity: item.quantity,
                priceAtTime: Number(product.sellPrice.toFixed(2))
            });

            total += itemTotal;
        }

        // Create and save the purchase
        const purchase = new Purchase({
            adminId: req.admin._id,
            products: productsWithPrices,
            total: Number(total.toFixed(2)),
            paymentMethod: req.body.paymentMethod,
            transactionId: req.body.transactionId || undefined
        });

        await purchase.save();
        await purchase.populate('adminId', 'username');
        await purchase.populate({
            path: 'products.productId',
            select: 'name owner sellPrice'
        });

        res.status(201).json(purchase);
    } catch (error) {
        console.error('Purchase creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 