const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    costPrice: {
        type: Number,
        required: true,
        min: 0
    },
    staffPrice:{
        type: Number,
        required: true,
        min: 0
    },
    sellPrice:{
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    owner: {
        type: String,
        required: true,
        enum: ['Owner 1', 'Owner 2'],
        default: 'Owner 1'
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subcategory: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for faster queries
productSchema.index({ name: 1 });
productSchema.index({ owner: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ isAvailable: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product; 