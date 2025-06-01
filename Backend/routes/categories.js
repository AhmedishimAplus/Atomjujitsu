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
        res.status(500).json({ error: 'Server error' });
    }
});

// Get categories by owner
router.get('/owner/:owner', auth, async (req, res) => {
    try {
        const categories = await Category.find({ owner: req.params.owner })
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
    body('owner').isIn(['Owner 1', 'Owner 2']).withMessage('Invalid owner'),
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, owner, subcategories } = req.body;

        // Check for duplicate category name for the same owner
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive name check
            owner 
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
            owner,
            subcategories
        });

        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update category
router.put('/:id', [
    auth,
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('owner').isIn(['Owner 1', 'Owner 2']).withMessage('Invalid owner'),
    body('subcategories').isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').trim().notEmpty().withMessage('Subcategory name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, owner, subcategories } = req.body;

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check for duplicate category name for the same owner
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            owner,
            _id: { $ne: category._id }
        });
        
        if (existingCategory) {
            return res.status(400).json({ error: 'Category name already exists for this owner' });
        }

        category.name = name;
        category.owner = owner;
        category.subcategories = subcategories;
        await category.save();

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
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete subcategory from category
router.delete('/:id/subcategories/:subcategoryName', auth, async (req, res) => {
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
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 