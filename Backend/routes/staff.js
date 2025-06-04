const express = require('express');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all staff members
router.get('/', auth, async (req, res) => {
    try {
        const staff = await Staff.find().sort({ name: 1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff member by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json(staff);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid staff ID format' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Create new staff member - only requires name
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if staff with the same name already exists
        const existingStaff = await Staff.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Case-insensitive name check
        });

        if (existingStaff) {
            return res.status(400).json({ error: 'Staff member with this name already exists' });
        }

        const staff = new Staff({
            name: req.body.name,
            // Default values for bottles will be set from the model
        });

        await staff.save();
        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update staff bottles
router.patch('/:id/bottles', [
    auth,
    body('Large_bottles').optional().isInt({ min: 0 }).withMessage('Large bottles must be a non-negative integer'),
    body('Small_bottles').optional().isInt({ min: 0 }).withMessage('Small bottles must be a non-negative integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updateData = {};
        if (req.body.Large_bottles !== undefined) updateData.Large_bottles = req.body.Large_bottles;
        if (req.body.Small_bottles !== undefined) updateData.Small_bottles = req.body.Small_bottles;

        const staff = await Staff.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update staff name
router.put('/:id', [
    auth,
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if another staff with the same name already exists
        const existingStaff = await Staff.findOne({
            _id: { $ne: req.params.id }, // Exclude current staff member
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } // Case-insensitive name check
        });

        if (existingStaff) {
            return res.status(400).json({ error: 'Staff member with this name already exists' });
        }

        const staff = await Staff.findByIdAndUpdate(
            req.params.id,
            { name: req.body.name },
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete staff member
router.delete('/:id', auth, async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search staff by name
router.get('/search', auth, async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'Name query parameter is required' });
        }

        // Case-insensitive search that matches partial names
        const staff = await Staff.find({
            name: { $regex: new RegExp(name, 'i') }
        }).sort({ name: 1 });

        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset bottles for all staff to default values
router.post('/reset-bottles', auth, async (req, res) => {
    try {
        await Staff.updateMany(
            {}, // Match all documents
            { Large_bottles: 2, Small_bottles: 2 } // Reset to default values
        );

        const updatedStaff = await Staff.find().sort({ name: 1 });
        res.json(updatedStaff);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;