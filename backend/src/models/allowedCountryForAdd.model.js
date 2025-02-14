import mongoose from 'mongoose';

const allowedCountryForAddSchema = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true,
        unique: true
    },
    countryName: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('AllowedCountryForAdd', allowedCountryForAddSchema); 