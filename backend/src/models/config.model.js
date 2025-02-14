import mongoose from 'mongoose';
import { BOT_MESSAGES } from '../config/messages.js';

const configSchema = new mongoose.Schema({
    messages: {
        type: Object,
        default: BOT_MESSAGES
    },
    membershipCheckEnabled: {
        type: Boolean,
        required: true,
        default: false
    },
    supportLink: {
        type: String,
        required: true,
        default: process.env.SUPPORT_LINK
    },
    rulesLink: {
        type: String,
        required: true,
        default: process.env.RULES_LINK
    },
    addAccountWebAppUrl: {
        type: String,
        required: true,
        default: process.env.ADD_ACCOUNT_WEB_APP_URL
    },
    maxCodeRequests: {
        type: Number,
        required: true,
        default: process.env.MAX_CODE_REQUESTS
    },
    paymentMethods: {
        bankGateway: {
            type: Boolean,
            default: false
        },
        crypto: {
            walletAddress: {
                type: String,
                required: true,
                default: process.env.CRYPTO_WALLET_ADDRESS
            },
            currencyName: {
                type: String,
                required: true,
                default: process.env.CRYPTO_CURRENCY_NAME
            },
            network: {
                type: String,
                required: true,
                default: process.env.CRYPTO_NETWORK
            },
            minAmount: {
                type: Number,
                required: true,
                default: process.env.CRYPTO_MIN_AMOUNT
            },
            enabled: {
                type: Boolean,
                default: true
            }
        },
        cardToCard: {
            cardNumber: {
                type: String,
                required: true,
                default: process.env.CARD_TO_CARD_NUMBER
            },
            cardHolder: {
                type: String,
                required: true,
                default: process.env.CARD_TO_CARD_HOLDER
            },
            minAmount: {
                type: Number,
                required: true,
                default: process.env.CARD_TO_CARD_MIN_AMOUNT
            },
            enabled: {
                type: Boolean,
                default: true
            }
        }
    },
    telegramApi: {
        apiId: {
            type: Number,
            required: true,
            default: process.env.API_ID
        },
        apiHash: {
            type: String,
            required: true,
            default: process.env.API_HASH
        }
    }
}, {
    timestamps: true
});

export default mongoose.model('Config', configSchema); 