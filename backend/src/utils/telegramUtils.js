import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/StringSession.js";
import { Api } from "telegram";
import { getConfig } from '../config/config.js';
import logger from '../config/logger.js';
import Account from '../models/account.model.js';

class TelegramAccountManager {
    constructor(accountId) {
        this.accountId = accountId;
        this.client = null;
    }

    async connect() {
        try {
            const account = await Account.findById(this.accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            const config = await getConfig();
            const stringSession = new StringSession(account.sessionKey);

            this.client = new TelegramClient(
                stringSession,
                config.telegramApi.apiId,
                config.telegramApi.apiHash,
                {
                    connectionRetries: 5,
                    useWSS: false
                }
            );

            await this.client.connect();
            return this.client;
        } catch (error) {
            logger.error('Error connecting to Telegram:', error);
            throw error;
        }
    }

    async getLatestCode() {
        try {
            await this.connect();

            // دریافت آخرین پیام از 777000
            const messages = await this.client.getMessages(777000, { limit: 1 });

            if (messages.length > 0) {
                const message = messages[0];
                const codeMatch = message.message.match(/\d{5}/);

                if (codeMatch) {
                    return {
                        code: codeMatch[0],
                        message: message.message,
                        date: message.date
                    };
                }
            }

            return null;
        } catch (error) {
            logger.error('Error getting latest code:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.connect();
            await this.client.invoke(new Api.auth.LogOut({}));
            await Account.findByIdAndUpdate(this.accountId, { isLoggedIn: false });
            return true;
        } catch (error) {
            logger.error('Error logging out:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.disconnect();
                this.client = null;
            }
        } catch (error) {
            logger.error('Error disconnecting from Telegram:', error);
            throw error;
        }
    }
}

export { TelegramAccountManager }; 