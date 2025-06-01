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
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Owner',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for faster queries
categorySchema.index({ name: 1, ownerId: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category; 