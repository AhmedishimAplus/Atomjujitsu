const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.find()
            .populate('ownerId', 'name')
            .sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get categories by owner
router.get('/owner/:ownerId', auth, async (req, res) => {
    try {
        const categories = await Category.find({ ownerId: req.params.ownerId })
            .populate('ownerId', 'name')
            .sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create category
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('ownerId').notEmpty().withMessage('Owner ID is required'),
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        //ownerId is the id of the owner who is creating the category
        const { name, ownerId, subcategories } = req.body;

        // Check for duplicate category name for the same owner
        const existingCategory = await Category.findOne({ name, ownerId });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists for this owner' });
        }

        const category = new Category({
            name,
            ownerId,
            subcategories
        });

        await category.save();
        await category.populate('ownerId', 'name');
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update category
router.put('/:id', [
    auth,
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

        // Check for duplicate category name for the same owner
        const existingCategory = await Category.findOne({
            name,
            ownerId: category.ownerId,
            _id: { $ne: category._id }
        });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category name already exists for this owner' });
        }

        category.name = name;
        category.subcategories = subcategories;
        await category.save();
        await category.populate('ownerId', 'name');

        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete category
router.delete('/:id', auth, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 