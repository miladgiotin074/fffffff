import mongoose from 'mongoose';
import { getConfig } from './config.js';
import logger from './logger.js';

const connectDB = async () => {
    try {
        const mongoOptions = {
        };

        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
});

export default connectDB; 