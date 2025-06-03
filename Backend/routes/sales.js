const express = require('express');
const { body, validationResult } = require('express-validator');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Staff = require('../models/Staff');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all sales (with optional date range filters)
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // Apply date filter if provided
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const sales = await Sale.find(query)
            .sort({ createdAt: -1 })
            .populate('staffId', 'name')
            .populate('createdBy', 'name email');

        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sale by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('staffId', 'name')
            .populate('createdBy', 'name email');

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json(sale);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid sale ID format' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Process a sale (checkout)
router.post('/', [
    auth,
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required'),
    body('items.*.name').notEmpty().withMessage('Product name is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.regularPrice').isFloat({ min: 0 }).withMessage('Regular price must be a positive number'),
    body('items.*.staffPrice').isFloat({ min: 0 }).withMessage('Staff price must be a positive number'),
    body('items.*.priceUsed').isFloat({ min: 0 }).withMessage('Price used must be a positive number'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
    body('staffDiscount').isBoolean().withMessage('Staff discount must be a boolean'),
    body('paymentMethod').isIn(['Cash', 'InstaPay']).withMessage('Invalid payment method'),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            items,
            subtotal,
            staffDiscount,
            staffId,
            staffName,
            paymentMethod,
            total
        } = req.body;

        // Create the sale object
        const sale = new Sale({
            items,
            subtotal,
            staffDiscount,
            paymentMethod,
            total,
            createdBy: req.user.id
        });

        // Initialize Sharoofa amount
        let sharoofaAmount = 0;

        // Handle staff discount logic if applicable
        if (staffDiscount) {
            let staff;

            // Check if staffId is provided
            if (staffId) {
                staff = await Staff.findById(staffId);
            }
            // Otherwise try to find by name
            else if (staffName) {
                staff = await Staff.findOne({
                    name: { $regex: new RegExp(`^${staffName}$`, 'i') } // Case-insensitive name search
                });
            }

            if (!staff) {
                return res.status(400).json({ error: 'Staff member not found' });
            }

            sale.staffId = staff._id;
            sale.staffName = staff.name;

            // Track water bottle purchases
            let hasLargeWaterBottle = false;
            let hasSmallWaterBottle = false;

            // Process each item in the sale and calculate Sharoofa amount
            for (const item of items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(400).json({ error: `Product not found: ${item.name}` });
                }

                // Prevent overselling: check stock before decrementing
                if (product.stock < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock for product: ${item.name}` });
                }

                // Check if the product is a water bottle
                if (product.name.toLowerCase().includes('large water bottle')) {
                    hasLargeWaterBottle = true;
                } else if (product.name.toLowerCase().includes('small water bottle')) {
                    hasSmallWaterBottle = true;
                }

                // Calculate Sharoofa amount for this item
                if (product.owner === 'Sharoofa') {
                    sharoofaAmount += item.priceUsed * item.quantity;
                }

                // Update product stock
                product.stock = Math.max(0, product.stock - item.quantity);
                await product.save();
            }

            // Update staff water bottle allowances
            if (hasLargeWaterBottle) {
                if (staff.Large_bottles > 0) {
                    staff.Large_bottles--;
                    sale.largeWaterBottle = true;
                } else {
                    return res.status(400).json({ error: 'Staff large water bottle allowance exceeded' });
                }
            }
            if (hasSmallWaterBottle) {
                if (staff.Small_bottles > 0) {
                    staff.Small_bottles--;
                    sale.smallWaterBottle = true;
                } else {
                    return res.status(400).json({ error: 'Staff small water bottle allowance exceeded' });
                }
            }
            await staff.save();
        } else {
            // If not a staff sale, update all product stock levels and calculate Sharoofa amount
            for (const item of items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(400).json({ error: `Product not found: ${item.name}` });
                }
                // Prevent overselling: check stock before decrementing
                if (product.stock < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock for product: ${item.name}` });
                }
                // Calculate Sharoofa amount for this item
                if (product.owner === 'Sharoofa') {
                    sharoofaAmount += item.priceUsed * item.quantity;
                }
                // Update product stock
                product.stock = Math.max(0, product.stock - item.quantity);
                await product.save();
            }
        }

        // Set the Sharoofa amount in the sale
        sale.sharoofaAmount = sharoofaAmount;

        // Save the sale
        await sale.save();
        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current week's sales total (Friday-to-Friday weeks)
router.get('/current-week-total', auth, async (req, res) => {
    try {        // Create a Date object for "now" in UTC to ensure consistent timezone handling
        const now = new Date();

        // Find the beginning of the current week (Friday-based weeks)
        // A new week starts every Friday and ends the following Thursday
        const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        let daysToSubtract;

        if (dayOfWeek === 5) { // Friday - start of a new week
            daysToSubtract = 0; // Today is the start of a new week
        } else if (dayOfWeek === 6) { // Saturday
            daysToSubtract = 1; // Go back to Friday (yesterday)
        } else if (dayOfWeek === 0) { // Sunday
            daysToSubtract = 2; // Go back to Friday (2 days ago)
        } else {
            // Monday (1) through Thursday (4)
            // Go back to the most recent Friday
            daysToSubtract = dayOfWeek + 2; // +2 because we're counting back from the previous Friday
        }

        // Create start date in UTC for consistent timezone handling
        // Using the most recent Friday as the start of the week, regardless of month
        const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToSubtract, 0, 0, 0, 0));

        // Calculate the end date (next Thursday at 23:59:59.999 UTC)
        // If today is Thursday, end date is today; otherwise it's the next Thursday
        const endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6, 23, 59, 59, 999));

        // Get all sales for the period (both Quarter and Sharoofa)
        const allSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$total" }
                }
            }
        ]);

        // Get Quarter-only sales for profit calculation
        const quarterSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $match: {
                    "productInfo.owner": "Quarter"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ["$items.priceUsed", "$items.quantity"] } }
                }
            }
        ]);        // Get weekly expenses for profit calculation (Quarter only)
        const expenses = await Expense.aggregate([
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

        const allSalesTotal = allSalesResult.length > 0 ? allSalesResult[0].total : 0;
        const quarterSalesTotal = quarterSalesResult.length > 0 ? quarterSalesResult[0].total : 0;
        const expensesTotal = expenses.length > 0 ? expenses[0].total : 0;
        // Profit calculation uses only Quarter sales
        const profit = quarterSalesTotal - expensesTotal;        // Format dates to a readable format that doesn't show timezone
        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        };

        res.json({
            sales: allSalesTotal,
            quarterSales: quarterSalesTotal,
            expenses: expensesTotal,
            profit: profit, // Profit is calculated using only Quarter sales
            period: {
                start: formatDate(startOfWeek),
                end: formatDate(endOfWeek)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current month's sales total
router.get('/current-month-total', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        // Get all sales for the period (both Quarter and Sharoofa)
        const allSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$total" }
                }
            }
        ]);

        // Get Quarter-only sales for profit calculation
        const quarterSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $match: {
                    "productInfo.owner": "Quarter"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ["$items.priceUsed", "$items.quantity"] } }
                }
            }
        ]);        // Get monthly expenses for profit calculation (Quarter only)
        const expenses = await Expense.aggregate([
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

        const allSalesTotal = allSalesResult.length > 0 ? allSalesResult[0].total : 0;
        const quarterSalesTotal = quarterSalesResult.length > 0 ? quarterSalesResult[0].total : 0;
        const expensesTotal = expenses.length > 0 ? expenses[0].total : 0;
        // Profit calculation uses only Quarter sales
        const profit = quarterSalesTotal - expensesTotal;

        // Format dates to a readable format that doesn't show timezone
        const formatDate = (date) => {
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        };

        res.json({
            sales: allSalesTotal,
            quarterSales: quarterSalesTotal,
            expenses: expensesTotal,
            profit: profit, // Profit is calculated using only Quarter sales
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales by product for the current month (for analytics)
router.get('/product-analytics/month', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $group: {
                    _id: "$items.productId",
                    name: { $first: "$items.name" },
                    totalQuantity: { $sum: "$items.quantity" },
                    totalSales: { $sum: { $multiply: ["$items.priceUsed", "$items.quantity"] } }
                }
            },
            {
                $sort: { totalSales: -1 }
            }
        ]);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        res.json({
            data: result,
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily sales for the current week (for charts)
router.get('/daily-sales/week', auth, async (req, res) => {
    try {
        // Get the start of the week (most recent Friday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        let daysToSubtract;

        if (dayOfWeek === 5) { // Friday
            daysToSubtract = 0;
        } else if (dayOfWeek === 6) { // Saturday
            daysToSubtract = 1;
        } else if (dayOfWeek === 0) { // Sunday
            daysToSubtract = 2;
        } else {
            daysToSubtract = dayOfWeek + 2;
        }

        const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToSubtract, 0, 0, 0, 0));
        const endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6, 23, 59, 59, 999));

        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalSales: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);

        // Create a complete dataset for all 7 days of the week
        const salesByDay = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setUTCDate(startOfWeek.getUTCDate() + i);

            const dayData = result.find(item =>
                item._id.year === day.getUTCFullYear() &&
                item._id.month === day.getUTCMonth() + 1 &&
                item._id.day === day.getUTCDate()
            );

            salesByDay.push({
                date: day.toISOString().split('T')[0],
                dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getUTCDay()],
                totalSales: dayData ? dayData.totalSales : 0,
                count: dayData ? dayData.count : 0
            });
        }

        res.json({
            data: salesByDay,
            period: {
                start: startOfWeek.toISOString().split('T')[0],
                end: endOfWeek.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly sales by payment method (for charts)
router.get('/payment-method-analytics', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    total: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format for frontend chart use
        const paymentMethodData = result.map(item => ({
            method: item._id,
            total: item.total,
            count: item.count
        }));

        // Format dates
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        res.json({
            data: paymentMethodData,
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff purchase statistics for the month
router.get('/staff-analytics', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                    staffDiscount: true,
                    staffId: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$staffId",
                    staffName: { $first: "$staffName" },
                    totalSpent: { $sum: "$total" },
                    purchaseCount: { $sum: 1 },
                    largeWaterBottles: { $sum: { $cond: ["$largeWaterBottle", 1, 0] } },
                    smallWaterBottles: { $sum: { $cond: ["$smallWaterBottle", 1, 0] } }
                }
            },
            {
                $sort: { totalSpent: -1 }
            }
        ]);

        // Get staff details to include remaining bottle counts
        const staffWithDetails = await Promise.all(result.map(async (item) => {
            const staff = await Staff.findById(item._id);
            return {
                ...item,
                largeWaterBottlesRemaining: staff ? staff.Large_bottles : 0,
                smallWaterBottlesRemaining: staff ? staff.Small_bottles : 0
            };
        }));

        // Format dates
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        res.json({
            data: staffWithDetails,
            period: {
                start: formatDate(startOfMonth),
                end: formatDate(endOfMonth)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales data for yearly trends (monthly aggregation)
router.get('/yearly-sales', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0)); // January 1st of current year
        const endOfYear = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999)); // December 31st of current year        // Get all sales data (both Quarter and Sharoofa)
        const allSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    totalSales: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.month": 1 } // Sort by month (1-12)
            }
        ]);

        // Get Quarter-only sales data for profit calculation
        const quarterSalesResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $unwind: "$items"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $match: {
                    "productInfo.owner": "Quarter"
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    totalQuarterSales: { $sum: { $multiply: ["$items.priceUsed", "$items.quantity"] } }
                }
            },
            {
                $sort: { "_id.month": 1 } // Sort by month (1-12)
            }
        ]);

        // Get expense data for the same period
        const expenses = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$date" } },
                    totalExpenses: { $sum: "$amount" }
                }
            },
            {
                $sort: { "_id.month": 1 } // Sort by month (1-12)
            }
        ]);        // Create an array for all months (1-12) with sales, expenses, and profit data
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const monthNumber = i + 1; // 1-based month index (January = 1)
            const allSalesData = allSalesResult.find(item => item._id.month === monthNumber) || { totalSales: 0, count: 0 };
            const quarterSalesData = quarterSalesResult.find(item => item._id.month === monthNumber) || { totalQuarterSales: 0 };
            const expenseData = expenses.find(item => item._id.month === monthNumber) || { totalExpenses: 0 };

            return {
                month: monthNumber,
                monthName: new Date(Date.UTC(now.getFullYear(), i, 1)).toLocaleString('default', { month: 'long' }),
                sales: allSalesData.totalSales,
                quarterSales: quarterSalesData.totalQuarterSales,
                expenses: expenseData.totalExpenses,
                // Profit is calculated using only Quarter sales
                profit: quarterSalesData.totalQuarterSales - expenseData.totalExpenses,
                transactionCount: allSalesData.count
            };
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

// Get daily money owed to Sharoofa
router.get('/sharoofa-daily', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let start, end;

        // If specific date range is provided, use it
        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to showing the last 30 days
            end = new Date();
            end.setHours(23, 59, 59, 999);
            start = new Date();
            start.setDate(end.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        // Aggregate the data by day
        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    sharoofaAmount: { $gt: 0 }  // Only include sales with Sharoofa products
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalOwed: { $sum: "$sharoofaAmount" },
                    salesCount: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1
                }
            }
        ]);

        // Format the response to make it more usable
        const formattedResult = result.map(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            return {
                date: date.toISOString().split('T')[0], // YYYY-MM-DD format
                totalOwed: item.totalOwed,
                salesCount: item.salesCount
            };
        });

        // Calculate the total owed for the period
        const totalOwed = formattedResult.reduce((sum, item) => sum + item.totalOwed, 0);

        res.json({
            data: formattedResult,
            totalOwed,
            period: {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get total amount owed to Sharoofa by date range (for settlements)
router.get('/sharoofa-settlement', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Both startDate and endDate are required' });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get total sales amount for Sharoofa products in the period
        const result = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$sharoofaAmount" },
                    cashAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentMethod", "Cash"] },
                                "$sharoofaAmount",
                                0
                            ]
                        }
                    },
                    instaPayAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentMethod", "InstaPay"] },
                                "$sharoofaAmount",
                                0
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const settlement = result.length > 0 ? {
            totalAmount: result[0].totalAmount,
            cashAmount: result[0].cashAmount,
            instaPayAmount: result[0].instaPayAmount,
            salesCount: result[0].count
        } : {
            totalAmount: 0,
            cashAmount: 0,
            instaPayAmount: 0,
            salesCount: 0
        };

        res.json({
            settlement,
            period: {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales history with costPrice, categoryId, and subcategory for each item
router.get('/history-with-cost', auth, async (req, res) => {
    try {
        const { startDate, endDate, categoryId, subcategory } = req.query;
        let saleQuery = {};
        // Optional date filter
        if (startDate && endDate) {
            saleQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        // Fetch sales
        const sales = await Sale.find(saleQuery).sort({ createdAt: -1 });
        // For each sale, populate product info for each item
        const productIds = Array.from(new Set(sales.flatMap(sale => sale.items.map(item => item.productId))));
        const products = await Product.find({ _id: { $in: productIds } });
        // Map productId to product info
        const productMap = {};
        products.forEach(prod => {
            productMap[prod._id.toString()] = prod;
        });
        // Build sales with costPrice, categoryId, subcategory for each item
        const salesWithCost = sales.map(sale => {
            const filteredItems = sale.items
                .map(item => {
                    const prod = productMap[item.productId?.toString()];
                    if (!prod) return null;
                    // Filter by categoryId/subcategory if requested
                    if (categoryId && prod.categoryId.toString() !== categoryId) return null;
                    if (subcategory && prod.subcategory !== subcategory) return null;
                    return {
                        ...item.toObject(),
                        costPrice: prod.costPrice,
                        categoryId: prod.categoryId,
                        subcategory: prod.subcategory
                    };
                })
                .filter(Boolean);
            return {
                ...sale.toObject(),
                items: filteredItems
            };
        });
        res.json(salesWithCost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
