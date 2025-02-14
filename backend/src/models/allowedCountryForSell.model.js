import mongoose from 'mongoose';

const allowedCountryForSellSchema = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true,
        unique: true
    },
    countryName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('AllowedCountryForSell', allowedCountryForSellSchema); 