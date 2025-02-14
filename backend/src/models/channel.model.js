import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    channelName: {
        type: String,
        required: true
    },
    channelLink: {
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

export default mongoose.model('Channel', channelSchema); 