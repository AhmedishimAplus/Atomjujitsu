const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    regularPrice: {
        type: Number,
        required: true,
        min: 0
    },
    staffPrice: {
        type: Number,
        required: true,
        min: 0
    },
    priceUsed: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: false
    },
    subcategory: {
        type: String,
        required: false
    }
});

const saleSchema = new mongoose.Schema({
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    staffDiscount: {
        type: Boolean,
        default: false
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: false
    }, staffName: {
        type: String,
        required: false
    },
    largeWaterBottle: {
        type: Boolean,
        default: false
    },
    smallWaterBottle: {
        type: Boolean,
        default: false
    },
    largeWaterBottlesFree: {
        type: Number,
        default: 0
    },
    smallWaterBottlesFree: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'InstaPay'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    sharoofaAmount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes for faster queries and aggregation
saleSchema.index({ createdAt: -1 });
saleSchema.index({ staffId: 1 });
saleSchema.index({ staffDiscount: 1 });
saleSchema.index({ paymentMethod: 1 });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
