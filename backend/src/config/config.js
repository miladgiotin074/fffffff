import 'dotenv/config';
import Config from '../models/config.model.js';
import logger from './logger.js';

// Helper function to parse boolean values from env
const parseBoolean = (value) => value?.toLowerCase() === 'true';

const getConfig = async () => {
    try {
        let config = await Config.findOne();
        if (!config) {
            // Create default config if not exists
            config = await Config.create({});
        }
        return {
            bot: {
                token: process.env.BOT_TOKEN,
                webhookUrl: process.env.WEBHOOK_URL,
                polling: parseBoolean(process.env.BOT_POLLING),
                adminId: parseInt(process.env.ADMIN_ID)
            },
            server: {
                port: parseInt(process.env.PORT) || 3000,
            },
            mongodb: {
                uri: process.env.MONGODB_URI,
            },
            messages: config.messages,
            membershipCheckEnabled: config.membershipCheckEnabled,
            proxy: {
                enabled: parseBoolean(process.env.PROXY_ENABLED),
                username: process.env.PROXY_USERNAME,
                password: process.env.PROXY_PASSWORD,
                host: process.env.PROXY_HOST,
                port: process.env.PROXY_PORT
            },
            supportLink: config.supportLink,
            rulesLink: config.rulesLink,
            addAccountWebAppUrl: config.addAccountWebAppUrl,
            paymentMethods: config.paymentMethods || {
                bankGateway: false,
                crypto: true,
                cardToCard: true
            },
            cardToCard: {
                cardNumber: config.paymentMethods.cardToCard.cardNumber,
                cardHolder: config.paymentMethods.cardToCard.cardHolder,
                minAmount: parseInt(config.paymentMethods.cardToCard.minAmount)
            },
            maxCodeRequests: config.maxCodeRequests || 5,
            telegramApi: {
                apiId: config.telegramApi?.apiId || parseInt(process.env.API_ID),
                apiHash: config.telegramApi?.apiHash || process.env.API_HASH
            }
        };
    } catch (error) {
        logger.error('Error getting config:', error);
        throw error;
    }
};

export { getConfig }; 