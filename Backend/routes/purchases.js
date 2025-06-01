const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all purchases with filters
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, ownerId, paymentMethod } = req.query;
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
                select: 'name ownerId',
                populate: { path: 'ownerId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        // Filter by owner if specified
        if (ownerId) {
            purchases = purchases.filter(purchase =>
                purchase.products.some(product => 
                    product.productId.ownerId._id.toString() === ownerId
                )
            );
        }

        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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

        // Validate and update product stock
        const productsWithPrices = [];
        let total = 0;

        for (const item of req.body.products) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}`
                });
            }

            // Update stock
            product.stock -= item.quantity;
            await product.save();

            // Add to purchase items
            productsWithPrices.push({
                productId: item.productId,
                quantity: item.quantity,
                priceAtTime: product.price
            });

            total += product.price * item.quantity;
        }

        const purchase = new Purchase({
            adminId: req.admin._id,
            products: productsWithPrices,
            total,
            paymentMethod: req.body.paymentMethod,
            transactionId: req.body.transactionId
        });

        await purchase.save();
        
        // Populate the response
        await purchase.populate('adminId', 'username');
        await purchase.populate({
            path: 'products.productId',
            select: 'name ownerId',
            populate: { path: 'ownerId', select: 'name' }
        });

        res.status(201).json(purchase);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 