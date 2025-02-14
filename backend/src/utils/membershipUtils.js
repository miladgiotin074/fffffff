import Channel from '../models/channel.model.js';
import logger from '../config/logger.js';

async function checkUserMembership(bot, userId, channels) {
    try {
        for (const channel of channels) {
            const member = await bot.getChatMember(channel.channelId, userId);
            if (member.status === 'left' || member.status === 'kicked') {
                return false;
            }
        }
        return true;
    } catch (error) {
        logger.error('Error checking user membership:', error);
        return false;
    }
}

export { checkUserMembership }; 