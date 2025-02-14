import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
    },
    username: {
        type: String,
    },
    lastInteraction: {
        type: Date,
        default: Date.now,
    },
    commandsUsed: {
        type: Number,
        default: 0,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'user'],
        default: 'user'
    },
    requestCount: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    purchasedAccountsCount: {
        type: Number,
        default: 0
    },
    totalDeposit: {
        type: Number,
        default: 0
    },
    totalPurchases: {
        type: Number,
        default: 0
    },
    lastDepositDate: {
        type: Date
    },
    lastPurchaseDate: {
        type: Date
    },
    waitingForReceipt: {
        type: Boolean,
        default: false
    },
    waitingForTransactionHash: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
});

export default mongoose.model('User', userSchema); 