const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');


// Add expense 
router.post('/', auth, async (req, res) => {
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

// Get all expenses 
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await Expense.find()
            .sort({ date: -1 })
            .populate('createdBy', 'name email');
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete expense 
router.delete('/:id', auth, async (req, res) => {
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

// Get monthly expenses (grouped by month)
router.get('/monthly', auth, async (req, res) => {
    try {
        const monthlyExpenses = await Expense.aggregate([
            {
                $group: {
                    _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                    total: { $sum: "$amount" },
                    expenses: { $push: "$description" }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);
        res.json(monthlyExpenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get weekly expenses (grouped by week)
router.get('/weekly', auth, async (req, res) => {
    try {
        const weeklyExpenses = await Expense.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        week: { $isoWeek: "$date" }
                    },
                    total: { $sum: "$amount" },
                    expenses: { $push: "$description" }
                }
            },
            { $sort: { '_id.year': -1, '_id.week': -1 } }
        ]);
        res.json(weeklyExpenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;