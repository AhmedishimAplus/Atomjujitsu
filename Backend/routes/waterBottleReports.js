const express = require('express');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

// Get water bottle usage statistics
router.get('/water-bottle-usage', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Set default date range to current month if not provided
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        // Make sure end date includes the entire day
        end.setHours(23, 59, 59, 999);

        // Find all sales with staff discount that involve water bottles
        const sales = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    staffDiscount: true,
                    staffId: { $exists: true, $ne: null },
                    $or: [
                        { largeWaterBottlesFree: { $gt: 0 } },
                        { smallWaterBottlesFree: { $gt: 0 } },
                        { "items.name": { $regex: /water bottle/i } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'staffs',
                    localField: 'staffId',
                    foreignField: '_id',
                    as: 'staffInfo'
                }
            },
            {
                $unwind: {
                    path: '$staffInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    staffId: 1,
                    staffName: { $ifNull: ['$staffInfo.name', '$staffName'] },
                    createdAt: 1,
                    items: 1,
                    largeWaterBottlesFree: { $ifNull: ['$largeWaterBottlesFree', 0] },
                    smallWaterBottlesFree: { $ifNull: ['$smallWaterBottlesFree', 0] }
                }
            }
        ]);

        // Process the sales to get usage statistics by staff member
        const staffMap = {};

        sales.forEach(sale => {
            if (!sale.staffId) return;

            const staffId = sale.staffId.toString();
            if (!staffMap[staffId]) {
                staffMap[staffId] = {
                    staffId: staffId,
                    staffName: sale.staffName || 'Unknown Staff',
                    largeBottlesUsed: 0,
                    largeBottlesFree: 0,
                    largeBottlesPaid: 0,
                    smallBottlesUsed: 0,
                    smallBottlesFree: 0,
                    smallBottlesPaid: 0,
                    lastUsed: sale.createdAt
                };
            }

            // Update last used date if this sale is more recent
            if (sale.createdAt > staffMap[staffId].lastUsed) {
                staffMap[staffId].lastUsed = sale.createdAt;
            }

            // Count free bottles from the sale
            staffMap[staffId].largeBottlesFree += sale.largeWaterBottlesFree || 0;
            staffMap[staffId].smallBottlesFree += sale.smallWaterBottlesFree || 0;

            // Count total bottles from items and calculate paid bottles
            sale.items.forEach(item => {
                const itemName = item.name.toLowerCase();
                if (itemName.includes('large water bottle')) {
                    staffMap[staffId].largeBottlesUsed += item.quantity;
                } else if (itemName.includes('small water bottle')) {
                    staffMap[staffId].smallBottlesUsed += item.quantity;
                }
            });
        });

        // Calculate paid bottles (total - free)
        Object.values(staffMap).forEach(staff => {
            staff.largeBottlesPaid = Math.max(0, staff.largeBottlesUsed - staff.largeBottlesFree);
            staff.smallBottlesPaid = Math.max(0, staff.smallBottlesUsed - staff.smallBottlesFree);
        });

        // Convert map to array and sort by staff name
        const result = Object.values(staffMap).sort((a, b) =>
            a.staffName.localeCompare(b.staffName)
        );

        res.json(result);
    } catch (error) {
        console.error('Error fetching water bottle usage:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get staff's recent water bottle usage (for display in staff profile)
router.get('/staff/:staffId/water-bottle-usage', auth, async (req, res) => {
    try {
        const { staffId } = req.params;

        // Validate staffId
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ error: 'Invalid staff ID format' });
        }

        // Get the last 5 water bottle purchases
        const recentPurchases = await Sale.find({
            staffId: staffId,
            $or: [
                { largeWaterBottlesFree: { $gt: 0 } },
                { smallWaterBottlesFree: { $gt: 0 } },
                { "items.name": { $regex: /water bottle/i } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Format the results
        const formattedPurchases = recentPurchases.map(purchase => {
            // Count bottles in this purchase
            let largeBottles = 0;
            let smallBottles = 0;
            let largeFree = purchase.largeWaterBottlesFree || 0;
            let smallFree = purchase.smallWaterBottlesFree || 0;

            purchase.items.forEach(item => {
                const itemName = item.name.toLowerCase();
                if (itemName.includes('large water bottle')) {
                    largeBottles += item.quantity;
                } else if (itemName.includes('small water bottle')) {
                    smallBottles += item.quantity;
                }
            });

            return {
                date: purchase.createdAt,
                largeBottles,
                smallBottles,
                largeFree,
                smallFree,
                largePaid: Math.max(0, largeBottles - largeFree),
                smallPaid: Math.max(0, smallBottles - smallFree),
                total: purchase.total
            };
        });

        res.json(formattedPurchases);
    } catch (error) {
        console.error('Error fetching staff water bottle usage:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
