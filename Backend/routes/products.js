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
        res.status(500).json({ error: 'Server error' });
    }
});

// Get products by owner
router.get('/owner/:owner', auth, async (req, res) => {
    try {
        const products = await Product.find({ owner: req.params.owner })
            .populate('categoryId', 'name subcategories')
            .sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new product
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost Price must be a positive number'),
    body('staffPrice').isFloat({ min: 0 }).withMessage('Staff Price must be a positive number'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('owner').isIn(['Owner 1', 'Owner 2']).withMessage('Invalid owner'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('subcategory').trim().notEmpty().withMessage('Subcategory is required'),
    body('description').optional().trim()
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
        if (category.owner !== req.body.owner) {
            return res.status(400).json({ error: 'Product owner must match category owner' });
        }

        const subcategoryExists = category.subcategories.some(
            sub => sub.name === req.body.subcategory
        );
        if (!subcategoryExists) {
            return res.status(400).json({ 
                error: `Invalid subcategory. Must be one of: ${category.subcategories.map(s => s.name).join(', ')}`
            });
        }

        const product = new Product({
            name: req.body.name,
            costPrice: req.body.costPrice,
            staffPrice: req.body.staffPrice,
            sellPrice: req.body.sellPrice,
            stock: req.body.stock,
            owner: req.body.owner,
            categoryId: req.body.categoryId,
            subcategory: req.body.subcategory,
            description: req.body.description,
            isAvailable: req.body.isAvailable !== false
        });

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
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost Price must be a positive number'),
    body('staffPrice').isFloat({ min: 0 }).withMessage('Staff Price must be a positive number'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell Price must be a positive number'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('owner').isIn(['Owner 1', 'Owner 2']).withMessage('Invalid owner'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('subcategory').trim().notEmpty().withMessage('Subcategory is required'),
    body('description').optional().trim()
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
        if (category.owner !== req.body.owner) {
            return res.status(400).json({ error: 'Product owner must match category owner' });
        }

        const subcategoryExists = category.subcategories.some(
            sub => sub.name === req.body.subcategory
        );
        if (!subcategoryExists) {
            return res.status(400).json({ 
                error: `Invalid subcategory. Must be one of: ${category.subcategories.map(s => s.name).join(', ')}`
            });
        }
        

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                costPrice: req.body.costPrice,
                staffPrice: req.body.staffPrice,
                sellPrice: req.body.sellPrice,
                stock: req.body.stock,
                owner: req.body.owner,
                categoryId: req.body.categoryId,
                subcategory: req.body.subcategory,
                description: req.body.description,
                isAvailable: req.body.isAvailable !== false
            },
            { new: true }
        ).populate('categoryId', 'name subcategories');

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product.costPrice, product.staffPrice, product.sellPrice, product.stock, product.owner);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
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
        res.status(500).json({ error: 'Server error' });
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
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 