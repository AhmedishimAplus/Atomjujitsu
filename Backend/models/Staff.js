const mongoose = require('mongoose');
const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    Large_bottles:{
        type: Number,
        required: true,
        default: 2,
        min: 0
    },
    Small_bottles:{
        type: Number,
        required: true,
        default: 2,
        min: 0
    },
}, {
    timestamps: true
});
const Staff = mongoose.model('Staff', staffSchema);
module.exports = Staff;
