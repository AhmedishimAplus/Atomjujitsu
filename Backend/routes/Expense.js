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
                    total: { $sum: "$amount" }
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
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { '_id.year': -1, '_id.week': -1 } }
        ]);
        res.json(weeklyExpenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current month's total expenses
router.get('/current-month-total', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const result = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        res.json({
            total,
            period: {
                start: startOfMonth,
                end: endOfMonth
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current week's total expenses (weeks end on Friday and reset on 1st of each month)
router.get('/current-week-total', auth, async (req, res) => {
    try {
        const now = new Date();

        // Check if it's a new month (1st of the month) - if so, we'll only count from the 1st
        const isFirstOfMonth = now.getDate() === 1;
        let startOfWeek;

        if (isFirstOfMonth) {
            // If it's 1st of month, start count from today
            startOfWeek = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        } else {
            // Find the most recent Monday (1 = Monday in getDay() when using ISO weekday)
            const dayOfWeek = now.getDay() || 7; // Convert Sunday (0) to 7 for ISO weekday
            const daysFromMonday = dayOfWeek - 1; // Monday is 1 in ISO

            startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - daysFromMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            // If startOfWeek is in the previous month, and we're not on the 1st,
            // then we need to set it to the 1st of current month
            if (startOfWeek.getMonth() !== now.getMonth()) {
                startOfWeek = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            }
        }

        // End of week is Friday (5 = Friday in getDay()) or the current day if before Friday
        let endOfWeek;
        const fridayOfWeek = new Date(startOfWeek);
        const daysUntilFriday = 5 - startOfWeek.getDay(); // 5 = Friday
        fridayOfWeek.setDate(startOfWeek.getDate() + (daysUntilFriday >= 0 ? daysUntilFriday : daysUntilFriday + 7));
        fridayOfWeek.setHours(23, 59, 59, 999);

        // If today is before Friday, use today as the end date
        if (now < fridayOfWeek) {
            endOfWeek = new Date(now);
            endOfWeek.setHours(23, 59, 59, 999);
        } else {
            endOfWeek = fridayOfWeek;
        }
        const result = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        res.json({
            total,
            period: {
                start: startOfWeek,
                end: endOfWeek
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;