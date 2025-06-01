const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Add expense (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        const expense = new Expense({
            description,
            amount,
            category,
            date: date || Date.now(),
            createdBy: req.user.id
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all expenses (admin only)
router.get('/', auth, adminAuth, async (req, res) => {
    try {
        const expenses = await Expense.find()
            .sort({ date: -1 })
            .populate('createdBy', 'name email');
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete expense (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;