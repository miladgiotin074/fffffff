import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { getConfig } from './config/config.js';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import commands from './handlers/commandHandlers.js';
import callbacks from './handlers/callbackHandlers.js';
import { tgAuthMiddleware } from './middleware/authMiddleware.js';
import userModel from './models/user.model.js';
import AllowedCountryForAdd from './models/allowedCountryForAdd.model.js';
import Account from './models/account.model.js';
import User from './models/user.model.js';
import Config from './models/config.model.js';

// Connect to MongoDB
connectDB();

const app = express();
app.use(express.json());

const setupBot = async () => {
    try {
        const config = await getConfig();
        const options = {
            polling: config.bot.polling
        };

        if (config.proxy?.enabled) {
            options.request = {
                proxy: `http://${config.proxy.username}:${config.proxy.password}@${config.proxy.host}:${config.proxy.port}`
            };
            logger.info('Bot using proxy configuration');
        }

        const bot = new TelegramBot(config.bot.token, options);
        return { bot, config };
    } catch (error) {
        logger.error('Error setting up bot:', error);
        process.exit(1);
    }
};

// Create bot instance and get config
const { bot, config } = await setupBot();

// Ensure only one instance is running
if (global.telegramBotInstance) {
    logger.error('Another instance of the bot is already running!');
    process.exit(1);
} else {
    global.telegramBotInstance = bot;
    process.on('exit', () => {
        global.telegramBotInstance = null;
    });
}

// Set webhook
if (config.bot.polling) {
    bot.setWebHook(config.bot.webhookUrl).then(() => {
        logger.info(`Webhook set to ${config.bot.webhookUrl}`);
        bot.getWebHookInfo().then((info) => {
            logger.info(JSON.stringify(info));
        });
    }).catch((error) => {
        logger.error('Error setting webhook:', error);
        process.exit(1);
    });
} else {
    // If no webhook URL is provided, use polling
    bot.startPolling();
    logger.info('Bot started polling');
}

// Command handlers
bot.onText(/\/start/, (msg) => commands.start(bot, msg));
bot.onText(new RegExp(config.messages.support), (msg) => commands.handleSupport(bot, msg));
bot.onText(new RegExp(config.messages.rules), (msg) => commands.handleRules(bot, msg));
bot.onText(new RegExp(config.messages.addAccount), (msg) => commands.handleAddAccount(bot, msg));
bot.onText(new RegExp(config.messages.userAccount), (msg) => commands.handleUserAccount(bot, msg));
bot.onText(new RegExp(config.messages.checkNumber), (msg) => commands.handleCheckNumber(bot, msg));
bot.onText(new RegExp(config.messages.wallet), (msg) => commands.handleWallet(bot, msg));

// Handle text messages for payment methods
bot.onText(new RegExp(config.messages.bankGateway), (msg) => commands.handleBankGateway(bot, msg));
bot.onText(new RegExp(config.messages.crypto), (msg) => commands.handleCrypto(bot, msg));
bot.onText(new RegExp(config.messages.cardToCard), (msg) => commands.handleCardToCard(bot, msg));

bot.onText(new RegExp(config.messages.backToMainMenu), async (msg) => {
    const user = await User.findOne({ telegramId: msg.from.id });
    if (user?.waitingForReceipt) {
        await User.findOneAndUpdate(
            { telegramId: msg.from.id },
            { $set: { waitingForReceipt: false } }
        );
    }
    commands.start(bot, msg);
});

// Add buy account command handler
bot.onText(new RegExp(config.messages.buyAccount), (msg) => commands.handleBuyAccount(bot, msg));

// Callback query handler
bot.on('callback_query', async (query) => {
    if (query.data.startsWith('select_country_')) {
        await callbacks.select_country(bot, query);
    } else if (query.data.startsWith('confirm_purchase_')) {
        await callbacks.confirm_purchase(bot, query);
    } else if (query.data.startsWith('get_code_')) {
        await callbacks.get_code(bot, query);
    } else if (query.data === 'view_purchased_accounts') {
        await callbacks.view_purchased_accounts(bot, query);
    } else if (query.data.startsWith('logout_account_')) {
        await callbacks.logout_account(bot, query);
    } else {
        const handler = callbacks[query.data];
        if (handler) {
            await handler(bot, query);
        }
    }
});

// Error handler
bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
    logger.error('Webhook error:', error);
});

// Express error handler
app.use((err, req, res, next) => {
    logger.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Add webhook route
app.post('/webhook', (req, res) => {
    try {
        // Process the incoming update from Telegram
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        logger.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

// خطوط مربوط به endpoint احراز هویت
app.post('/api/check-auth', tgAuthMiddleware, async (req, res) => {
    try {
        const user = await userModel.findOne({
            telegramId: req.userData.user.id
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // دریافت لیست اکانت‌ها با sessionKey برای اکانت‌هایی که cleanSessions نیستند
        const accounts = await Account.find({ addedBy: user._id })
            .select('phone addedAt isSettled cleanSessions sessionKey')
            .sort({ addedAt: -1 });

        res.status(200).json({
            valid: true,
            user: {
                id: user.telegramId,
                role: user.role,
                username: user.username
            },
            accounts: accounts.map(acc => ({
                ...acc.toObject(),
                sessionKey: acc.cleanSessions ? '' : acc.sessionKey
            }))
        });
    } catch (error) {
        logger.error('Auth check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بعد از سایر endpointها
app.post('/api/check-country-for-add', tgAuthMiddleware, async (req, res) => {
    try {
        const { countryCode, phone } = req.body;
        const user = await userModel.findOne({
            telegramId: req.userData.user.id
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // بررسی وجود اکانت با این شماره تلفن
        const existingAccount = await Account.findOne({ phone });
        if (existingAccount) {
            return res.status(400).json({
                error: 'ACCOUNT_EXISTS',
                accountExists: true
            });
        }

        const countries = await AllowedCountryForAdd.find({ isActive: true });

        // اگر هیچ کشوری فعال وجود نداشته باشد
        if (countries.length === 0) {
            return res.status(200).json({
                allowed: false,
                allowedCountries: [],
                userRole: user.role,
                message: 'No active countries available'
            });
        }

        // Map the countries to the expected format
        const formattedCountries = countries.map(c => ({
            countryCode: c.countryCode,
            countryName: c.countryName
        }));

        const allowedCountry = await AllowedCountryForAdd.findOne({
            countryCode,
            isActive: true
        });

        if (!allowedCountry) {
            return res.status(200).json({
                allowed: false,
                allowedCountries: formattedCountries,
                userRole: user.role
            });
        }

        res.status(200).json({
            allowed: true,
            allowedCountries: formattedCountries,
            userRole: user.role
        });
    } catch (error) {
        logger.error('Error checking country for add:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بعد از سایر endpointها
app.post('/api/add-account', tgAuthMiddleware, async (req, res) => {
    try {
        const { phone, password, cleanSessions, sessionKey } = req.body;
        const user = await userModel.findOne({
            telegramId: req.userData.user.id
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // بررسی وجود اکانت
        const existingAccount = await Account.findOne({ phone });
        if (existingAccount) {
            return res.status(400).json({
                error: 'این اکانت قبلاً در سیستم ثبت شده است'
            });
        }

        // ایجاد اکانت جدید
        const newAccount = await Account.create({
            phone,
            password,
            cleanSessions,
            sessionKey,
            addedBy: user._id,
            isSettled: user.role === 'admin'
        });

        res.status(201).json({
            success: true,
            account: newAccount
        });
    } catch (error) {
        logger.error('Error adding account:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بعد از سایر endpointها
app.post('/api/update-sessions', tgAuthMiddleware, async (req, res) => {
    try {
        const { phone, cleanSessions } = req.body;
        const user = await userModel.findOne({
            telegramId: req.userData.user.id
        });

        if (!user || !['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // پیدا کردن اکانت مربوطه و به‌روزرسانی cleanSessions
        const updatedAccount = await Account.findOneAndUpdate(
            { phone },
            { $set: { cleanSessions } },
            { new: true }
        );

        if (!updatedAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json({
            success: true,
            account: updatedAccount
        });
    } catch (error) {
        logger.error('Error updating sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add photo handler
bot.on('photo', (msg) => commands.handlePhoto(bot, msg));

// Add transaction hash handler
bot.on('text', async (msg) => {
    const user = await User.findOne({ telegramId: msg.from.id });
    if (user?.waitingForTransactionHash) {
        commands.handleTransactionHash(bot, msg);
    }
});

// Start Express server
app.listen(config.server.port, () => {
    logger.info(`Express server is running on port ${config.server.port}`);
});

process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    if (global.telegramBotInstance) {
        global.telegramBotInstance.stopPolling();
        global.telegramBotInstance = null;
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});