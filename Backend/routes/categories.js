const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category
router.post('/', [
    auth,
    require('../middleware/adminAuth'),
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, subcategories } = req.body;

        // Check for duplicate category name
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') } // Case-insensitive name check
        });

        if (existingCategory) {
            // If category exists, update its subcategories instead
            const newSubcategories = [...existingCategory.subcategories];

            // Add new subcategories that don't exist
            subcategories.forEach(newSub => {
                const exists = newSubcategories.some(
                    existingSub => existingSub.name.toLowerCase() === newSub.name.toLowerCase()
                );
                if (!exists) {
                    newSubcategories.push(newSub);
                }
            });

            existingCategory.subcategories = newSubcategories;
            await existingCategory.save();
            return res.json(existingCategory);
        }

        const category = new Category({
            name,
            subcategories
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update category
router.put('/:id', [
    auth,
    require('../middleware/adminAuth'),
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, subcategories } = req.body;

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check for duplicate category name
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: category._id }
        });

        if (existingCategory) {
            return res.status(400).json({ error: 'Category name already exists' });
        }

        category.name = name;
        category.subcategories = subcategories;
        await category.save();

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete category
router.delete('/:id', [auth, require('../middleware/adminAuth')], async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add subcategories to category
router.post('/:id/subcategories', [
    auth,
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const newSubcategories = [...category.subcategories];

        // Add new subcategories that don't exist
        req.body.subcategories.forEach(newSub => {
            const exists = newSubcategories.some(
                existingSub => existingSub.name.toLowerCase() === newSub.name.toLowerCase()
            );
            if (!exists) {
                newSubcategories.push(newSub);
            }
        });

        category.subcategories = newSubcategories;
        await category.save();

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete subcategory from category
router.delete('/:id/subcategories/:subcategoryName', [auth, require('../middleware/adminAuth')], async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const subcategoryIndex = category.subcategories.findIndex(
            sub => sub.name.toLowerCase() === req.params.subcategoryName.toLowerCase()
        );

        if (subcategoryIndex === -1) {
            return res.status(404).json({ error: 'Subcategory not found' });
        }

        category.subcategories.splice(subcategoryIndex, 1);
        await category.save();

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:id', auth, async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await Category.findById(categoryId).select('name').exec();
        return res.json(category);
    }
    catch (error) {
        return res.status(404).json({ error: 'Category not found' });
    }
});

// Get category statistics with product details
router.get('/statistics', auth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        const Product = require('../models/Product'); // Import Product model

        const categoryStats = [];

        for (const category of categories) {
            const subcategoryStats = [];

            // Process each subcategory
            for (const subcategory of category.subcategories) {
                // Find all products in this subcategory
                const products = await Product.find({
                    categoryId: category._id,
                    subcategory: subcategory.name,
                    isAvailable: true
                });

                // Calculate subcategory statistics
                const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
                const avgSellPrice = products.length > 0
                    ? products.reduce((sum, product) => sum + product.sellPrice, 0) / products.length
                    : 0;
                const avgStaffPrice = products.length > 0
                    ? products.reduce((sum, product) => sum + product.staffPrice, 0) / products.length
                    : 0;

                subcategoryStats.push({
                    name: subcategory.name,
                    productCount: products.length,
                    totalStock,
                    averagePrices: {
                        sell: Number(avgSellPrice.toFixed(2)),
                        staff: Number(avgStaffPrice.toFixed(2))
                    },
                    products: products.map(product => ({
                        name: product.name,
                        category: category.name,
                        description: product.description,
                        stock: product.stock,
                        sellPrice: product.sellPrice,
                        staffPrice: product.staffPrice
                    }))
                });
            }

            // Calculate category totals
            const allProducts = await Product.find({
                categoryId: category._id,
                isAvailable: true
            });

            categoryStats.push({
                categoryId: category._id,
                name: category.name,
                totalProducts: allProducts.length,
                totalStock: allProducts.reduce((sum, product) => sum + product.stock, 0),
                averagePrices: {
                    sell: allProducts.length > 0
                        ? Number((allProducts.reduce((sum, product) => sum + product.sellPrice, 0) / allProducts.length).toFixed(2))
                        : 0,
                    staff: allProducts.length > 0
                        ? Number((allProducts.reduce((sum, product) => sum + product.staffPrice, 0) / allProducts.length).toFixed(2))
                        : 0
                },
                subcategories: subcategoryStats
            });
        }

        res.json(categoryStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;