const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Add leaner indexing for faster queries
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true   // ✅ helps in search queries by name
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true, // ✅ ensures consistent matching
        index: true       // ✅ queries on email will be faster
    },
    password: {
        type: String,
        required: true,
        select: false    // ✅ password is excluded by default in queries
    },
    profileImageUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });

// ✅ Hash password before saving only if modified
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12); // use stronger cost factor
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// ✅ Compare password safely
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ✅ Virtual: return safe JSON (no password exposure)
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
