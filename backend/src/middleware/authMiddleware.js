import { validateInitData } from '../utils/auth.js';
import logger from '../config/logger.js';
import { parseInitData } from '../utils/auth.js';

export async function tgAuthMiddleware(req, res, next) {
    try {
        const initData = req.headers['authorization'];

        if (!initData) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        const isValid = validateInitData(initData, process.env.BOT_TOKEN);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid Telegram init data' });
        }

        req.userData = parseInitData(initData);
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
} 