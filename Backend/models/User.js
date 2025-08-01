const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    role: {
        type: String,
        enum: ['Admin', 'Cashier'],
        default: 'Cashier',
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false // New cashiers need admin approval
    },
    twoFactorSecret: {
        type: String,
        select: false // Don't include in queries by default
    },
    isTwoFactorEnabled: {
        type: Boolean,
        default: false
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Pre-find hook to check if lockout period has expired
userSchema.pre('findOne', async function () {
    // Add a query condition to identify users whose lockout period has expired
    // but still have login attempts > 0
    const now = new Date();
    this.or([
        { lockUntil: { $exists: false } },
        { lockUntil: null },
        { lockUntil: { $gt: now } },
        // This is the important part: find users whose lockout has expired
        {
            $and: [
                { lockUntil: { $lt: now } },
                { loginAttempts: { $gt: 0 } }
            ]
        }
    ]);
});

// Hook that runs after finding a user to reset login attempts if lockout has expired
userSchema.post('findOne', async function (result, next) {
    if (!result) return next();

    // If the user's lockout period has expired but they still have login attempts
    if (result.lockUntil && result.lockUntil < Date.now() && result.loginAttempts > 0) {
        console.log(`Auto-resetting login attempts for ${result.email} after lockout period expired`);
        result.loginAttempts = 0;
        result.lockUntil = null;
        await result.save();
    }

    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to encrypt the 2FA secret
userSchema.methods.encryptTwoFactorSecret = function (secret) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.TWO_FACTOR_SECRET_KEY || 'default-key-please-change-in-env', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
};

// Method to decrypt the 2FA secret
userSchema.methods.decryptTwoFactorSecret = function () {
    if (!this.twoFactorSecret) return null;

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.TWO_FACTOR_SECRET_KEY || 'default-key-please-change-in-env', 'salt', 32);

    const parts = this.twoFactorSecret.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

// Method to handle failed login attempts
userSchema.methods.incrementLoginAttempts = async function () {
    // If account is already locked, do nothing
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return this;
    }

    // Increment attempts counter
    this.loginAttempts += 1;

    // Lock account if too many attempts
    const MAX_LOGIN_ATTEMPTS = 5;
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        console.log(`Locking account for user ${this.email} after ${this.loginAttempts} failed attempts`);
        this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
    }

    return this.save();
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
    // If lockout has expired, consider account unlocked
    if (this.lockUntil && this.lockUntil <= Date.now()) {
        return false;
    }
    return this.lockUntil && this.lockUntil > Date.now();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
};

module.exports = mongoose.model('User', userSchema);
