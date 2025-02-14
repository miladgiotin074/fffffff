import User from '../models/user.model.js';
import logger from '../config/logger.js';

// تنظیمات rate limit
const RATE_LIMIT = {
    WINDOW_SIZE: 20 * 1000,
    MAX_REQUESTS: 5
};

async function rateLimiter(telegramId) {
    try {
        const user = await User.findOne({ telegramId });
        const now = Date.now();

        if (!user) {
            return true;
        }

        // اگر آخرین درخواست بیش از WINDOW_SIZE گذشته باشد، reset کن
        if (now - user.lastInteraction > RATE_LIMIT.WINDOW_SIZE) {
            user.requestCount = 0;
            user.lastInteraction = now;
        }

        // اگر تعداد درخواست‌ها از حد مجاز بیشتر باشد
        if (user.requestCount >= RATE_LIMIT.MAX_REQUESTS) {
            return false;
        }

        // افزایش تعداد درخواست‌ها و به‌روزرسانی زمان آخرین تعامل
        user.requestCount += 1;
        user.lastInteraction = now;
        await user.save();

        return true;
    } catch (error) {
        logger.error('Error in rate limiter:', error);
        return true; // در صورت خطا، rate limit را اعمال نکن
    }
}

export { rateLimiter, RATE_LIMIT }; 