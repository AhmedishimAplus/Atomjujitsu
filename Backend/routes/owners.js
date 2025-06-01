const express = require('express');
const { body, validationResult } = require('express-validator');
const Owner = require('../models/Owner');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all owners
router.get('/', auth, async (req, res) => {
    try {
        const owners = await Owner.find().sort({ name: 1 });
        res.json(owners);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new owner
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const owner = new Owner({
            name: req.body.name
        });

        await owner.save();
        res.status(201).json(owner);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update owner
router.put('/:id', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const owner = await Owner.findByIdAndUpdate(
            req.params.id,
            { name: req.body.name },
            { new: true }
        );

        if (!owner) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        res.json(owner);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete owner
router.delete('/:id', auth, async (req, res) => {
    try {
        const owner = await Owner.findByIdAndDelete(req.params.id);
        
        if (!owner) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        res.json({ message: 'Owner deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 