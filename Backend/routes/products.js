const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', auth, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name subcategories')
            .sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get product by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'name subcategories');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get products by owner
router.get('/owner/:owner', [
    auth,
    body('owner').isIn(['Quarter', 'Sharoofa']).withMessage('Invalid owner')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const products = await Product.find({ owner: req.params.owner })
            .populate('categoryId', 'name subcategories')
            .sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new product
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('staffPrice').isFloat({ min: 0 }).withMessage('Staff Price must be a positive number'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('owner').isIn(['Quarter', 'Sharoofa']).withMessage('Invalid owner'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('subcategory').trim().notEmpty().withMessage('Subcategory is required'),
    body('description').optional().trim(),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost Price must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify that the subcategory exists in the category
        const category = await Category.findById(req.body.categoryId);
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        // Verify owner matches category owner

        const subcategoryExists = category.subcategories.some(
            sub => sub.name === req.body.subcategory
        );
        if (!subcategoryExists) {
            return res.status(400).json({
                error: `Invalid subcategory. Must be one of: ${category.subcategories.map(s => s.name).join(', ')}`
            });
        }

        // Create product object with basic properties
        const productData = {
            name: req.body.name,
            staffPrice: req.body.staffPrice,
            sellPrice: req.body.sellPrice,
            stock: req.body.stock,
            owner: req.body.owner,
            categoryId: req.body.categoryId,
            subcategory: req.body.subcategory,
            description: req.body.description,
            isAvailable: req.body.isAvailable !== false
        };

        // Only include costPrice for Quarter products
        if (req.body.owner === 'Quarter') {
            if (req.body.costPrice === undefined) {
                return res.status(400).json({ error: 'Cost Price is required for Quarter products' });
            }
            productData.costPrice = req.body.costPrice;
        }

        const product = new Product(productData);

        await product.save();
        await product.populate('categoryId', 'name subcategories');
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/:id', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('staffPrice').isFloat({ min: 0 }).withMessage('Staff Price must be a positive number'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('owner').isIn(['Quarter', 'Sharoofa']).withMessage('Invalid owner'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('subcategory').trim().notEmpty().withMessage('Subcategory is required'),
    body('description').optional().trim(),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost Price must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Verify that the subcategory exists in the category
        const category = await Category.findById(req.body.categoryId);
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        // Verify owner matches category owner


        const subcategoryExists = category.subcategories.some(
            sub => sub.name === req.body.subcategory
        );
        if (!subcategoryExists) {
            return res.status(400).json({
                error: `Invalid subcategory. Must be one of: ${category.subcategories.map(s => s.name).join(', ')}`
            });
        }

        // Create update object with basic properties
        const updateData = {
            name: req.body.name,
            staffPrice: req.body.staffPrice,
            sellPrice: req.body.sellPrice,
            stock: req.body.stock,
            owner: req.body.owner,
            categoryId: req.body.categoryId,
            subcategory: req.body.subcategory,
            description: req.body.description,
            isAvailable: req.body.isAvailable !== false
        };

        // Only include costPrice for Quarter products
        if (req.body.owner === 'Quarter') {
            if (req.body.costPrice === undefined) {
                return res.status(400).json({ error: 'Cost Price is required for Quarter products' });
            }
            updateData.costPrice = req.body.costPrice;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('categoryId', 'name subcategories'); if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update stock
router.patch('/:id/stock', [
    auth,
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock: req.body.stock },
            { new: true }
        ).populate('categoryId', 'name subcategories');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get formatted product prices (with staff and regular prices)
router.get('/formatted-prices', auth, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('categoryId', 'name subcategories')
            .sort({ name: 1 });

        const formattedProducts = products.map(product => ({
            _id: product._id,
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            subcategory: product.subcategory,
            isAvailable: product.isAvailable,
            stock: product.stock,
            prices: {
                regular: product.sellPrice,
                staff: product.staffPrice
            },
            owner: product.owner
        }));

        res.json(formattedProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;