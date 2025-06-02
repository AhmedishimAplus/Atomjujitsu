const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subcategories: [{
        name: {
            type: String,
            required: true,
            trim: true
        }
    }],
    owner: {
        type: String,
        required: true,
        enum: ['Owner 1', 'Owner 2'],
        default: 'Owner 1'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
categorySchema.index({ name: 1, owner: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category; 