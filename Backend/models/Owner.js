const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Owner = mongoose.model('Owner', ownerSchema);
module.exports = Owner; 