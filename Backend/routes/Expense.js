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

// Get current month's total expenses
router.get('/current-month-total', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

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

        // Format dates to a readable format that doesn't show timezone
        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        };

        const total = result.length > 0 ? result[0].total : 0;
        res.json({
            total,
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current week's total expenses
router.get('/current-week-total', auth, async (req, res) => {
    try {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate start of week (Sunday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);

        // Calculate end of week (Saturday)
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - day));
        endOfWeek.setHours(23, 59, 59, 999);

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

        // Format dates to a readable format that doesn't show timezone
        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        };

        const total = result.length > 0 ? result[0].total : 0;
        res.json({
            total,
            period: {
                start: formatDate(startOfWeek),
                end: formatDate(endOfWeek)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily expenses for the current month
router.get('/daily/month', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const expenses = await Expense.find({
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        // Group expenses by day
        const expensesByDay = {};

        for (const expense of expenses) {
            const date = new Date(expense.date).toISOString().split('T')[0]; // YYYY-MM-DD format

            if (!expensesByDay[date]) {
                expensesByDay[date] = {
                    date,
                    total: 0,
                    count: 0
                };
            }

            expensesByDay[date].total += expense.amount || 0;
            expensesByDay[date].count += 1;
        }

        const result = Object.values(expensesByDay);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily expenses for the current week
router.get('/daily/week', auth, async (req, res) => {
    try {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate start of week (Sunday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);

        // Calculate end of week (Saturday)
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - day));
        endOfWeek.setHours(23, 59, 59, 999);

        const expenses = await Expense.find({
            date: { $gte: startOfWeek, $lte: endOfWeek }
        }).lean();

        // Group expenses by day
        const expensesByDay = {};

        for (const expense of expenses) {
            const date = new Date(expense.date).toISOString().split('T')[0]; // YYYY-MM-DD format

            if (!expensesByDay[date]) {
                expensesByDay[date] = {
                    date,
                    total: 0,
                    count: 0
                };
            }

            expensesByDay[date].total += expense.amount || 0;
            expensesByDay[date].count += 1;
        }

        const result = Object.values(expensesByDay);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current month's expenses by category (for bar chart)
router.get('/current-month-by-category', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const result = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: "$amount" }
                }
            },
            {
                $sort: { "_id": 1 } // Sort by category name
            }
        ]);

        // Format the response for the bar chart
        const categoryTotals = result.map(item => ({
            category: item._id,
            total: item.total
        }));

        // Format dates to a readable format
        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        };

        res.json({
            data: categoryTotals,
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get yearly expenses by month (for line chart)
router.get('/yearly-expenses', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0)); // January 1st of current year
        const endOfYear = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999)); // December 31st of current year

        const result = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$date" } },
                    total: { $sum: "$amount" }
                }
            },
            {
                $sort: { "_id.month": 1 } // Sort by month (1-12)
            }
        ]);

        // Create an array for all months (1-12) with default 0 values
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1, // 1-based month index (January = 1)
            monthName: new Date(Date.UTC(now.getFullYear(), i, 1)).toLocaleString('default', { month: 'long' }),
            total: 0
        }));

        // Fill in the actual values from the aggregation result
        result.forEach(item => {
            const monthIndex = item._id.month - 1; // Convert 1-based to 0-based index
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyData[monthIndex].total = item.total;
            }
        });

        res.json({
            data: monthlyData,
            period: {
                year: now.getFullYear()
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;