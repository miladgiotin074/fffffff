import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: String,
    cleanSessions: {
        type: Boolean,
        default: false
    },
    sessionKey: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isSettled: {
        type: Boolean,
        default: false
    },
    isSolded: {
        type: Boolean,
        default: false
    },
    soldAt: {
        type: Date
    },
    soldTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastCodeRequestDate: Date,
    totalCodeRequests: {
        type: Number,
        default: 0
    },
    isLoggedIn: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Account', accountSchema); 