const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    isStaff: {
        type: Boolean,
        default: false
    },
    staffName: {
        type: String,
        default: null
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update the updatedAt field before saving
bundleSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Bundle', bundleSchema);
