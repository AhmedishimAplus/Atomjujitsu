const express = require('express');
const { body, validationResult } = require('express-validator');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Staff = require('../models/Staff');
const Bundle = require('../models/Bundle');
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
router.get('/staff/:staffId/recent-purchases', auth, async (req, res) => {
    try {
        const { staffId } = req.params;

        // Validate staffId
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ error: 'Invalid staff ID format' });
        }

        // Get the most recent purchases for this staff member
        const recentPurchases = await Sale.find({
            staffId: staffId
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Format the response
        const formattedPurchases = recentPurchases.map(purchase => {
            // Calculate display amount including paid water bottles
            let nonWaterBottleTotal = 0;
            let paidWaterBottleTotal = 0;

            // Process each item
            if (purchase.items && Array.isArray(purchase.items)) {
                for (const item of purchase.items) {
                    if (item.name.toLowerCase().includes('water bottle')) {
                        // For water bottles, only count paid ones
                        if (item.paidQuantity > 0) {
                            paidWaterBottleTotal += item.priceUsed * item.paidQuantity;
                        }
                    } else {
                        // For non-water bottle items, count all
                        nonWaterBottleTotal += item.priceUsed * item.quantity;
                    }
                }
            }

            // Total should include non-water items + paid water bottles
            const displayAmount = nonWaterBottleTotal + paidWaterBottleTotal;

            return {
                _id: purchase._id,
                date: purchase.createdAt,
                total: displayAmount, // Update total to reflect the correct amount
                displayAmount, // Add displayAmount for consistency
                items: purchase.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.priceUsed,
                    freeQuantity: item.freeQuantity || 0,
                    paidQuantity: item.paidQuantity || item.quantity
                })),
                paymentMethod: purchase.paymentMethod,
                largeWaterBottlesFree: purchase.largeWaterBottlesFree || 0,
                smallWaterBottlesFree: purchase.smallWaterBottlesFree || 0
            };
        });

        return res.json(formattedPurchases);
    } catch (error) {
        console.error('Error fetching staff recent purchases:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Get staff purchases
router.get('/staff-purchases', auth, async (req, res) => {
    try {
        const salesStaff = await Sale.find({ staffDiscount: true, staffId: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).lean();

        // Format sales with correct display amounts
        const formattedSalesStaff = salesStaff.map(sale => {
            // Calculate correct display amount including paid water bottles
            let nonWaterBottleTotal = 0;
            let paidWaterBottleTotal = 0;

            // Process each item
            if (sale.items && Array.isArray(sale.items)) {
                for (const item of sale.items) {
                    if (item.name.toLowerCase().includes('water bottle')) {
                        // For water bottles, only count paid ones
                        if (item.paidQuantity > 0) {
                            paidWaterBottleTotal += item.priceUsed * item.paidQuantity;
                        }
                    } else {
                        // For non-water bottle items, count all
                        nonWaterBottleTotal += item.priceUsed * item.quantity;
                    }
                }
            }

            // Total should include non-water items + paid water bottles
            const displayAmount = nonWaterBottleTotal + paidWaterBottleTotal;

            return {
                ...sale,
                displayAmount,
                total: displayAmount // Update total to be consistent
            };
        });

        return res.json(formattedSalesStaff);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// Get sale by ID
// router.get('/:id', auth, async (req, res) => {
//     try {
//         // Validate that the id is a valid ObjectId before querying
//         if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
//             return res.status(400).json({ error: 'Invalid sale ID format' });
//         }
//         const sale = await Sale.findById(req.params.id)
//             .populate('staffId', 'name')
//             .populate('createdBy', 'name email');

//         if (!sale) {
//             return res.status(404).json({ error: 'Sale not found' });
//         }

//         res.json(sale);
//     } catch (error) {
//         if (error.kind === 'ObjectId') {
//             return res.status(400).json({ error: 'Invalid sale ID format' });
//         }
//         res.status(500).json({ error: error.message });
//     }
// });

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
    body('paymentMethod').isIn(['Cash', 'InstaPay', 'Bundles']).withMessage('Invalid payment method'),
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
            total,
            bundleId,
            phoneNumber
        } = req.body;

        // Validate bundle payment if applicable
        if (paymentMethod === 'Bundles') {
            if (!bundleId || !phoneNumber) {
                return res.status(400).json({ error: 'Bundle ID and phone number are required for bundle payments' });
            }

            // Verify the bundle exists (but skip balance check if total is 0)
            const bundle = await Bundle.findById(bundleId);
            if (!bundle) {
                return res.status(400).json({ error: 'Bundle not found' });
            }

            if (bundle.phoneNumber !== phoneNumber) {
                return res.status(400).json({ error: 'Phone number does not match bundle' });
            }

            // Check if this is a staff bundle and validate accordingly
            if (staffDiscount) {
                if (!bundle.isStaff) {
                    return res.status(400).json({ error: 'Cannot use staff discount with non-staff bundle' });
                }

                if (staffId && bundle.staffId?.toString() !== staffId) {
                    return res.status(400).json({ error: 'Bundle does not belong to the selected staff member' });
                }
            }

            // Only check balance if total is greater than 0
            if (total > 0) {
                // Check balance (allow up to 100 over limit)
                if (bundle.amount < total && (total - bundle.amount) > 100) {
                    return res.status(400).json({
                        error: `Insufficient bundle balance. Need ${(total - bundle.amount).toFixed(2)} more. Maximum overdraft is 100.00`
                    });
                }
            }
        }

        // Create the sale object
        const sale = new Sale({
            items,
            subtotal,
            staffDiscount,
            paymentMethod,
            total, // Will be recalculated if there are water bottle allowances
            createdBy: req.user.id
        });

        // Add bundle information if payment method is bundles
        if (paymentMethod === 'Bundles') {
            sale.bundleId = bundleId;
            sale.bundlePhoneNumber = phoneNumber;
        }

        // Initialize Sharoofa amount
        let sharoofaAmount = 0;

        // Calculate non-water bottle items total (used for staff discount cases)
        let nonWaterBottleTotal = 0;

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

            // Calculate non-water bottle total first
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
                const isLargeWaterBottle = product.name.toLowerCase().includes('large water bottle');
                const isSmallWaterBottle = product.name.toLowerCase().includes('small water bottle');

                if (isLargeWaterBottle) {
                    hasLargeWaterBottle = true;
                } else if (isSmallWaterBottle) {
                    hasSmallWaterBottle = true;
                } else {
                    // If not a water bottle, add to the non-water bottle total
                    nonWaterBottleTotal += item.priceUsed * item.quantity;
                }

                // Calculate Sharoofa amount for this item
                if (product.owner === 'Sharoofa') {
                    sharoofaAmount += item.priceUsed * item.quantity;
                }

                // Update product stock
                product.stock = Math.max(0, product.stock - item.quantity);
                await product.save();
            }            // Update staff water bottle allowances and adjust pricing
            // Find water bottle items in the purchase
            const largeWaterBottleItems = items.filter(item => {
                const productName = item.name.toLowerCase();
                return productName.includes('large water bottle');
            });

            const smallWaterBottleItems = items.filter(item => {
                const productName = item.name.toLowerCase();
                return productName.includes('small water bottle');
            });

            // Track the total discount for all water bottles
            let totalWaterBottleDiscount = 0;

            // Process large water bottles
            if (largeWaterBottleItems.length > 0) {
                let totalLargeBottles = 0;
                largeWaterBottleItems.forEach(item => {
                    totalLargeBottles += item.quantity;
                });

                // Calculate how many bottles can be covered by allowance
                let freeBottles = Math.min(staff.Large_bottles, totalLargeBottles);
                let freeBottlesRemaining = freeBottles;
                sale.largeWaterBottlesFree = freeBottles;

                // Update staff's allowance
                if (freeBottles > 0) {
                    staff.Large_bottles -= freeBottles;

                    // Update the sale items to reflect free bottles
                    for (const item of sale.items) {
                        if (item.name.toLowerCase().includes('large water bottle') && freeBottlesRemaining > 0) {
                            const freeBeveragesInThisItem = Math.min(freeBottlesRemaining, item.quantity);
                            freeBottlesRemaining -= freeBeveragesInThisItem;

                            // Calculate the discount amount
                            const regularPrice = item.regularPrice || item.priceUsed;
                            const discountAmount = regularPrice * freeBeveragesInThisItem;

                            // Add to total discount
                            totalWaterBottleDiscount += discountAmount;

                            // Store original price and quantity information for reference
                            item.freeQuantity = freeBeveragesInThisItem;
                            item.paidQuantity = item.quantity - freeBeveragesInThisItem;
                        }
                    }
                }
            }            // Process small water bottles
            if (smallWaterBottleItems.length > 0) {
                let totalSmallBottles = 0;
                smallWaterBottleItems.forEach(item => {
                    totalSmallBottles += item.quantity;
                });

                // Calculate how many bottles can be covered by allowance
                let freeBottles = Math.min(staff.Small_bottles, totalSmallBottles);
                let freeBottlesRemaining = freeBottles;
                sale.smallWaterBottlesFree = freeBottles;

                // Update staff's allowance
                if (freeBottles > 0) {
                    staff.Small_bottles -= freeBottles;

                    // Update the sale items to reflect free bottles
                    for (const item of sale.items) {
                        if (item.name.toLowerCase().includes('small water bottle') && freeBottlesRemaining > 0) {
                            const freeBeveragesInThisItem = Math.min(freeBottlesRemaining, item.quantity);
                            freeBottlesRemaining -= freeBeveragesInThisItem;

                            // Calculate the discount amount
                            const regularPrice = item.regularPrice || item.priceUsed;
                            const discountAmount = regularPrice * freeBeveragesInThisItem;

                            // Add to total discount
                            totalWaterBottleDiscount += discountAmount;

                            // Store original price and quantity information for reference
                            item.freeQuantity = freeBeveragesInThisItem;
                            item.paidQuantity = item.quantity - freeBeveragesInThisItem;
                        }
                    }
                }
            }            // Calculate the total including any paid water bottles (exceeding allowance)
            let paidWaterBottleTotal = 0;

            // Add paid water bottles (exceeding allowance) to the total
            for (const item of sale.items) {
                if ((item.name.toLowerCase().includes('water bottle')) && item.paidQuantity > 0) {
                    paidWaterBottleTotal += item.priceUsed * item.paidQuantity;
                }
            }

            // Final total = non-water bottle items + paid water bottles
            sale.total = Math.max(0, nonWaterBottleTotal + paidWaterBottleTotal);
            sale.subtotal = sale.total;

            // For the purposes of record-keeping, we never want the total/subtotal to be 0 when there are paid items
            if (sale.total === 0 && (nonWaterBottleTotal > 0 || paidWaterBottleTotal > 0)) {
                console.log("Warning: Sale total was 0 but paid items were present.");
                sale.total = nonWaterBottleTotal + paidWaterBottleTotal;
                sale.subtotal = nonWaterBottleTotal + paidWaterBottleTotal;
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
                    bundlesAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentMethod", "Bundles"] },
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
            bundlesAmount: result[0].bundlesAmount,
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

// Get totals for the current month
router.get('/totals/month', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        // Find all sales in the month
        const sales = await Sale.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        // Calculate total sales excluding Sharoofa products
        let totalSales = 0;
        let sharoofaTotal = 0;
        let freeWaterBottleTotal = 0;

        // Process each sale
        for (const sale of sales) {
            // Add to total sales
            totalSales += (sale.total || 0);

            // Subtract Sharoofa amount if present
            if (sale.sharoofaAmount) {
                sharoofaTotal += sale.sharoofaAmount;
            }
        }

        // Track free water bottles but don't subtract from total sales
        for (const sale of sales) {
            for (const item of sale.items) {
                if (item.productId && item.freeQuantity > 0) {
                    const product = await Product.findById(item.productId).lean();
                    if (product) {
                        const sellPrice = item.priceUsed || 0;
                        freeWaterBottleTotal += sellPrice * item.freeQuantity;
                    }
                }
            }
        }

        // Total sales excluding only Sharoofa products (keep free water bottles in total)
        const nonSharoofaTotal = totalSales - sharoofaTotal;

        // Calculate profit from sales (excluding Sharoofa)
        let totalProfit = 0;

        // Get cost prices for products sold
        for (const sale of sales) {
            for (const item of sale.items) {
                if (item.productId) {
                    const product = await Product.findById(item.productId).lean();
                    if (product && product.owner !== 'Sharoofa') {
                        const costPrice = product.costPrice || 0;
                        const sellPrice = item.priceUsed || 0;

                        // Check if item has free quantity due to water bottle allowance
                        const freeQty = item.freeQuantity || 0;
                        const paidQty = item.paidQuantity || (item.quantity - freeQty) || item.quantity;

                        if (freeQty > 0) {
                            // For paid portion: normal profit calculation
                            const paidProfit = (sellPrice - costPrice) * paidQty;
                            // For free portion: profit is negative sell price (since we give it for free but paid full price)
                            const freeProfit = -sellPrice * freeQty;
                            totalProfit += paidProfit + freeProfit;
                        } else {
                            // Normal calculation for non-free items
                            totalProfit += (sellPrice - costPrice) * item.quantity;
                        }
                    }
                }
            }
        }

        res.json({
            totalSales: nonSharoofaTotal,
            totalProfit: totalProfit,
            totalCount: sales.length,
            period: {
                start: startOfMonth,
                end: endOfMonth
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get totals for the current week
router.get('/totals/week', auth, async (req, res) => {
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

        // Find all sales in the week
        const sales = await Sale.find({
            createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }).lean();

        // Calculate total sales excluding Sharoofa products
        let totalSales = 0;
        let sharoofaTotal = 0;
        let freeWaterBottleTotal = 0;

        // Process each sale
        for (const sale of sales) {
            // Add to total sales
            totalSales += (sale.total || 0);

            // Subtract Sharoofa amount if present
            if (sale.sharoofaAmount) {
                sharoofaTotal += sale.sharoofaAmount;
            }
        }

        // Track free water bottles but don't subtract from total sales
        for (const sale of sales) {
            for (const item of sale.items) {
                if (item.productId && item.freeQuantity > 0) {
                    const product = await Product.findById(item.productId).lean();
                    if (product) {
                        const sellPrice = item.priceUsed || 0;
                        freeWaterBottleTotal += sellPrice * item.freeQuantity;
                    }
                }
            }
        }

        // Total sales excluding only Sharoofa products (keep free water bottles in total)
        const nonSharoofaTotal = totalSales - sharoofaTotal;

        // Calculate profit from sales (excluding Sharoofa)
        let totalProfit = 0;

        // Get cost prices for products sold
        for (const sale of sales) {
            for (const item of sale.items) {
                if (item.productId) {
                    const product = await Product.findById(item.productId).lean();
                    if (product && product.owner !== 'Sharoofa') {
                        const costPrice = product.costPrice || 0;
                        const sellPrice = item.priceUsed || 0;

                        // Check if item has free quantity due to water bottle allowance
                        const freeQty = item.freeQuantity || 0;
                        const paidQty = item.paidQuantity || (item.quantity - freeQty) || item.quantity;

                        if (freeQty > 0) {
                            // For paid portion: normal profit calculation
                            const paidProfit = (sellPrice - costPrice) * paidQty;
                            // For free portion: profit is negative sell price (since we give it for free but paid full price)
                            const freeProfit = -sellPrice * freeQty;
                            totalProfit += paidProfit + freeProfit;
                        } else {
                            // Normal calculation for non-free items
                            totalProfit += (sellPrice - costPrice) * item.quantity;
                        }
                    }
                }
            }
        }

        res.json({
            totalSales: nonSharoofaTotal,
            totalProfit: totalProfit,
            totalCount: sales.length,
            period: {
                start: startOfWeek,
                end: endOfWeek
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily sales data for the current month
router.get('/daily/month', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        // Find all sales in the month
        const sales = await Sale.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        // Group sales by day
        const salesByDay = {};

        for (const sale of sales) {
            const date = new Date(sale.createdAt).toISOString().split('T')[0];

            if (!salesByDay[date]) {
                salesByDay[date] = {
                    date,
                    total: 0,
                    sharoofaTotal: 0,
                    nonSharoofaTotal: 0,
                    count: 0
                };
            }

            salesByDay[date].total += (sale.total || 0);
            salesByDay[date].sharoofaTotal += (sale.sharoofaAmount || 0);
            salesByDay[date].count += 1;
        }

        // Calculate non-Sharoofa total for each day
        Object.keys(salesByDay).forEach(date => {
            salesByDay[date].nonSharoofaTotal = salesByDay[date].total - salesByDay[date].sharoofaTotal;
        });

        const result = Object.values(salesByDay);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily sales data for the current week
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

        // Find all sales in the week
        const sales = await Sale.find({
            createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }).lean();

        // Group sales by day
        const salesByDay = {};

        for (const sale of sales) {
            const date = new Date(sale.createdAt).toISOString().split('T')[0];

            if (!salesByDay[date]) {
                salesByDay[date] = {
                    date,
                    total: 0,
                    sharoofaTotal: 0,
                    nonSharoofaTotal: 0,
                    count: 0
                };
            }

            salesByDay[date].total += (sale.total || 0);
            salesByDay[date].sharoofaTotal += (sale.sharoofaAmount || 0);
            salesByDay[date].count += 1;
        }

        // Calculate non-Sharoofa total for each day
        Object.keys(salesByDay).forEach(date => {
            salesByDay[date].nonSharoofaTotal = salesByDay[date].total - salesByDay[date].sharoofaTotal;
        });

        const result = Object.values(salesByDay);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top products by revenue and quantity for the current month
router.get('/top-products/month', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        // Find all sales in the month
        const sales = await Sale.find({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).lean();

        // Track product sales
        const productSales = {};

        // Process each sale
        for (const sale of sales) {
            for (const item of sale.items) {
                const productId = item.productId.toString();

                if (!productSales[productId]) {
                    // Fetch product details to get the owner
                    const product = await Product.findById(productId).lean();

                    if (!product) continue;

                    productSales[productId] = {
                        productId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        owner: product.owner || 'Unknown'
                    };
                }

                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += item.priceUsed * item.quantity;
            }
        }

        // Convert to array and sort by revenue
        const result = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top products by revenue and quantity for the current week
router.get('/top-products/week', auth, async (req, res) => {
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

        // Find all sales in the week
        const sales = await Sale.find({
            createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }).lean();

        // Track product sales
        const productSales = {};

        // Process each sale
        for (const sale of sales) {
            for (const item of sale.items) {
                const productId = item.productId.toString();

                if (!productSales[productId]) {
                    // Fetch product details to get the owner
                    const product = await Product.findById(productId).lean();

                    if (!product) continue;

                    productSales[productId] = {
                        productId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        owner: product.owner || 'Unknown'
                    };
                }

                productSales[productId].quantity += item.quantity;
                productSales[productId].revenue += item.priceUsed * item.quantity;
            }
        }

        // Convert to array and sort by revenue
        const result = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate profit separately (more robust approach)
router.get('/profit/:period', auth, async (req, res) => {
    try {
        const { period } = req.params;
        let startDate, endDate;
        const now = new Date();

        if (period === 'week') {
            const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(now);
            endDate.setDate(now.getDate() + (6 - day));
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
            startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        } else {
            return res.status(400).json({ error: 'Invalid period. Use "week" or "month".' });
        }

        // Find all sales in the period
        const sales = await Sale.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean();

        // Calculate profit from sales (excluding Sharoofa)
        let totalProfit = 0;
        let totalSales = 0;
        let sharoofaTotal = 0;
        let freeWaterBottleTotal = 0;
        let processedItems = 0;
        let errorCount = 0;

        // Process each sale
        for (const sale of sales) {
            // Add to total sales
            totalSales += (sale.total || 0);

            // Subtract Sharoofa amount if present
            if (sale.sharoofaAmount) {
                sharoofaTotal += sale.sharoofaAmount;
            }
        }

        // Track free water bottles but don't subtract from total sales
        for (const sale of sales) {
            if (!sale.items || !Array.isArray(sale.items)) continue;

            for (const item of sale.items) {
                if (item && item.productId && item.freeQuantity > 0) {
                    const product = await Product.findById(item.productId).lean();
                    if (product) {
                        const sellPrice = item.priceUsed || 0;
                        freeWaterBottleTotal += sellPrice * item.freeQuantity;
                    }
                }
            }
        }

        // Calculate non-Sharoofa total (keep free water bottles in total)
        const nonSharoofaTotal = totalSales - sharoofaTotal;

        // Get cost prices for products sold
        try {
            for (const sale of sales) {
                if (!sale.items || !Array.isArray(sale.items)) continue;

                for (const item of sale.items) {
                    if (item && item.productId) {
                        try {
                            processedItems++;
                            const product = await Product.findById(item.productId).lean();
                            if (product && product.owner !== 'Sharoofa') {
                                const costPrice = product.costPrice || 0;
                                const sellPrice = item.priceUsed || 0;

                                // Check if item has free quantity due to water bottle allowance
                                const freeQty = item.freeQuantity || 0;
                                const paidQty = item.paidQuantity || (item.quantity - freeQty) || item.quantity || 0; if (freeQty > 0) {
                                    // For paid portion: normal profit calculation
                                    const paidProfit = (sellPrice - costPrice) * paidQty;
                                    // For free portion: profit is negative sell price (since we give it for free but paid full price)
                                    const freeProfit = -sellPrice * freeQty;
                                    totalProfit += paidProfit + freeProfit;
                                } else {
                                    // Normal calculation for non-free items
                                    totalProfit += (sellPrice - costPrice) * (item.quantity || 0);
                                }
                            }
                        } catch (err) {
                            errorCount++;
                            console.error(`Error processing product ${item.productId}:`, err);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error calculating profits:", err);
            return res.status(500).json({ error: "Error calculating profits" });
        }

        res.json({
            totalSales: nonSharoofaTotal,
            totalProfit: totalProfit,
            totalItems: processedItems,
            errorItems: errorCount,
            period: {
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff purchases

// Get last 3 purchases for a specific staff member
router.get('/staff-purchases/:staffId/recent', auth, async (req, res) => {
    try {
        const { staffId } = req.params;

        // Check if staffId is valid MongoDB ObjectId
        if (!staffId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                error: 'Invalid staff ID format',
                message: 'Staff ID must be a 24-character hexadecimal string'
            });
        }

        // Find the last 3 purchases for this staff
        const recentPurchases = await Sale.find({
            staffDiscount: true,
            staffId: staffId
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('staffId', 'name Large_bottles Small_bottles')
            .lean();

        // Format the response
        const formattedPurchases = recentPurchases.map(purchase => {
            const { _id, staffName, paymentMethod, total, subtotal, createdAt, items } = purchase;
            const staffDetails = purchase.staffId;

            // Calculate the correct display amount including paid water bottles
            let displayAmount = total;

            // Check if we need to calculate paid water bottles
            let hasPaidWaterBottles = false;
            let paidWaterBottleTotal = 0;

            // Loop through items to find paid water bottles
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    if (item.name.toLowerCase().includes('water bottle') && item.paidQuantity > 0) {
                        hasPaidWaterBottles = true;
                        paidWaterBottleTotal += item.priceUsed * item.paidQuantity;
                    }
                }
            }

            // Calculate the correct display amount
            // If there are non-water bottle items, ensure they're included in total
            let nonWaterBottleTotal = 0;
            if (items && Array.isArray(items)) {
                for (const item of items) {
                    if (!item.name.toLowerCase().includes('water bottle')) {
                        nonWaterBottleTotal += item.priceUsed * item.quantity;
                    }
                }
            }

            // The display amount should include non-water bottle items + paid water bottles
            displayAmount = nonWaterBottleTotal + paidWaterBottleTotal;

            return {
                _id,
                staffName,
                paymentMethod,
                total: displayAmount, // Update total to reflect paid water bottles
                displayAmount,
                createdAt,
                items,
                staffId: staffDetails ? staffDetails._id : null,
                staffDetails: staffDetails ? {
                    name: staffDetails.name,
                    largeBottles: staffDetails.Large_bottles,
                    smallBottles: staffDetails.Small_bottles
                } : null
            };
        });

        return res.json(formattedPurchases);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
