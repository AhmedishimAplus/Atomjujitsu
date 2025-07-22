const express = require('express');
const { body, validationResult } = require('express-validator');
const Bundle = require('../models/Bundle');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all bundles with search functionality
router.get('/', auth, async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // If search parameter is provided, search by phone number
        if (search) {
            query.phoneNumber = { $regex: search, $options: 'i' };
        }

        const bundles = await Bundle.find(query)
            .populate('staffId', 'name')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(bundles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bundle by phone number
router.get('/phone/:phoneNumber', auth, async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        console.log('Looking up bundle for phone number:', phoneNumber);

        const bundle = await Bundle.findOne({ phoneNumber })
            .populate('staffId', 'name')
            .populate('createdBy', 'name email');

        console.log('Bundle lookup result:', bundle);

        if (!bundle) {
            return res.status(404).json({ error: 'Bundle not found' });
        }

        res.json(bundle);
    } catch (error) {
        console.error('Error in phone lookup:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get bundle by staff ID
router.get('/staff/:staffId', auth, async (req, res) => {
    try {
        const { staffId } = req.params;
        console.log('Looking up bundle for staff ID:', staffId);

        const bundle = await Bundle.findOne({ staffId, isStaff: true })
            .populate('staffId', 'name')
            .populate('createdBy', 'name email');

        console.log('Staff bundle lookup result:', bundle);

        if (!bundle) {
            return res.status(404).json({ error: 'No bundle found for this staff member' });
        }

        res.json(bundle);
    } catch (error) {
        console.error('Error in staff bundle lookup:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new bundle
router.post('/', [
    body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .isLength({ min: 8 })
        .withMessage('Phone number must be at least 8 characters'),
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Initial amount cannot be negative');
            }
            return true;
        }),
    body('isStaff')
        .optional()
        .isBoolean()
        .withMessage('isStaff must be a boolean'),
    body('staffId')
        .optional()
        .custom((value, { req }) => {
            // If isStaff is true, staffId is required and must be a valid MongoDB ObjectId
            if (req.body.isStaff === true || req.body.isStaff === 'true') {
                if (!value || value.trim() === '') {
                    throw new Error('Staff ID is required when creating a staff bundle');
                }
                if (!/^[0-9a-fA-F]{24}$/.test(value)) {
                    throw new Error('Invalid staff ID format');
                }
            }
            // If isStaff is false and staffId is provided, it should be a valid ObjectId
            else if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
                throw new Error('Invalid staff ID format');
            }
            return true;
        })
], auth, async (req, res) => {
    try {
        console.log('Creating bundle with data:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { phoneNumber, amount, isStaff = false, staffId } = req.body;

        // Check if bundle with this phone number already exists
        const existingBundle = await Bundle.findOne({ phoneNumber });
        if (existingBundle) {
            console.log('Bundle already exists for phone:', phoneNumber);
            return res.status(400).json({ error: 'Bundle with this phone number already exists' });
        }

        let staffName = null;
        if (isStaff && staffId) {
            const staff = await Staff.findById(staffId);
            if (!staff) {
                console.log('Staff not found for ID:', staffId);
                return res.status(400).json({ error: 'Staff member not found' });
            }
            staffName = staff.name;
            console.log('Found staff:', staffName);
        }

        const bundle = new Bundle({
            phoneNumber,
            amount: parseFloat(amount),
            isStaff,
            staffName,
            staffId: isStaff ? staffId : null,
            createdBy: req.user.id
        });

        console.log('Saving bundle:', bundle);
        await bundle.save();
        console.log('Bundle saved successfully');

        // Populate the response
        await bundle.populate('staffId', 'name');
        await bundle.populate('createdBy', 'name email');

        res.status(201).json(bundle);
    } catch (error) {
        console.error('Error creating bundle:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Failed to create bundle', details: error.message });
    }
});

// Add funds to bundle
router.put('/:id/add-funds', [
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Amount must be positive');
            }
            return true;
        })
], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { amount } = req.body;

        const bundle = await Bundle.findById(id);
        if (!bundle) {
            return res.status(404).json({ error: 'Bundle not found' });
        }

        bundle.amount += parseFloat(amount);
        await bundle.save();

        // Populate the response
        await bundle.populate('staffId', 'name');
        await bundle.populate('createdBy', 'name email');

        res.json(bundle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update bundle amount (for purchases)
router.put('/:id/deduct', [
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Amount must be positive');
            }
            return true;
        })
], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { amount } = req.body;

        const bundle = await Bundle.findById(id);
        if (!bundle) {
            return res.status(404).json({ error: 'Bundle not found' });
        }

        // Calculate new amount after deduction
        const newAmount = bundle.amount - parseFloat(amount);

        // Check if the bundle would go below -100 (block purchase if so)
        if (newAmount < -100) {
            return res.status(400).json({
                error: 'Insufficient bundle balance',
                message: `Customer needs to settle ${Math.abs(newAmount + 100)} first`,
                currentBalance: bundle.amount,
                requiredAmount: Math.abs(newAmount + 100)
            });
        }

        bundle.amount = newAmount;
        await bundle.save();

        // Populate the response
        await bundle.populate('staffId', 'name');
        await bundle.populate('createdBy', 'name email');

        res.json(bundle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settle bundle (delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const bundle = await Bundle.findById(id);
        if (!bundle) {
            return res.status(404).json({ error: 'Bundle not found' });
        }

        await Bundle.findByIdAndDelete(id);

        res.json({ message: 'Bundle settled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
