const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        priceAtTime: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    total: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'instapay'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['paid'],
        default: 'paid'
    },
    transactionId: {
        type: String,
        required: function() {
            return this.paymentMethod === 'instapay';
        }
    }
}, {
    timestamps: true
});

// Indexes for faster queries
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ adminId: 1 });
purchaseSchema.index({ 'products.productId': 1 });
purchaseSchema.index({ paymentMethod: 1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase; 