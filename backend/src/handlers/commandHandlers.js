import { getConfig } from '../config/config.js';
import User from '../models/user.model.js';
import logger from '../config/logger.js';
import Channel from '../models/channel.model.js';
import { checkUserMembership } from '../utils/membershipUtils.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import AllowedCountryForSell from '../models/allowedCountryForSell.model.js';
import Account from '../models/account.model.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import PaymentReceipt from '../models/paymentReceipt.model.js';
import CryptoTransaction from '../models/cryptoTransaction.model.js';
import { formatJalaliDate } from '../utils/dateUtils.js';
const commands = {

    async start(bot, msg) {
        const chatId = msg.chat.id;
        try {
            // Check rate limit
            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const config = await getConfig();
            const isAdmin = msg.from.id === config.bot.adminId;

            // Check if admin user exists
            if (isAdmin) {
                const adminUser = await User.findOne({ telegramId: config.bot.adminId, role: 'admin' });
                if (!adminUser) {
                    // Create admin user if not exists
                    await User.create({
                        telegramId: config.bot.adminId,
                        firstName: msg.from.first_name || '',
                        lastName: msg.from.last_name || '',
                        username: msg.from.username || '',
                        role: 'admin'
                    });
                }
            }

            // Use different message for admin
            const welcomeMessage = isAdmin ?
                config.messages.startAdmin.replace('{firstName}', msg.from.first_name) :
                config.messages.start.replace('{firstName}', msg.from.first_name);

            // First find the user
            const existingUser = await User.findOne({ telegramId: msg.from.id });

            // Then update the user
            const user = await User.findOneAndUpdate(
                { telegramId: msg.from.id },
                {
                    firstName: msg.from.first_name || '',
                    lastName: msg.from.last_name || '',
                    username: msg.from.username || '',
                    lastInteraction: new Date(),
                    $inc: { commandsUsed: 1 },
                    // Use existing role if available, otherwise set to 'user' (or 'admin' if isAdmin)
                    role: isAdmin ? 'admin' : (existingUser?.role || 'user')
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Only check membership if user is not admin and membership check is enabled
            if (config.membershipCheckEnabled && user.role !== 'admin') {
                const channels = await Channel.find({ isActive: true });

                if (channels.length > 0) {
                    const isMember = await checkUserMembership(bot, msg.from.id, channels);
                    if (!isMember) {
                        const channelButtons = channels.map(channel => ({
                            text: channel.channelName,
                            url: channel.channelLink
                        }));

                        const keyboard = {
                            inline_keyboard: [
                                ...channelButtons.map(button => [button]),
                                [{ text: config.messages.joinCompleted, callback_data: 'check_membership' }]
                            ]
                        };

                        return bot.sendMessage(chatId, config.messages.membershipRequired.replace('{firstName}', msg.from.first_name), {
                            reply_markup: keyboard,
                            parse_mode: 'Markdown'
                        });
                    }
                }
            }

            // Create keyboard based on user role
            let keyboardButtons = [
                [config.messages.buyAccount, config.messages.checkNumber],
                [config.messages.wallet, config.messages.userAccount],
                [config.messages.rules, config.messages.support]
            ];

            if (user.role === 'moderator') {
                keyboardButtons.push([config.messages.addAccount]);
            }


            if (user.role === 'admin') {
                keyboardButtons.push([config.messages.addAccount, config.messages.adminPanel]);
            }

            const keyboard = {
                keyboard: keyboardButtons,
                resize_keyboard: true,
                one_time_keyboard: false
            };

            await bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in start command:', error);
        }
    },

    async handleSupport(bot, msg) {
        const chatId = msg.chat.id;
        try {
            // Check rate limit
            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const config = await getConfig();

            const keyboard = {
                inline_keyboard: [
                    [{
                        text: config.messages.contactSupport,
                        url: config.supportLink
                    }]
                ]
            };

            await bot.sendMessage(chatId, config.messages.supportMessage, {
                reply_markup: keyboard
            });
        } catch (error) {
            logger.error('Error in handleSupport:', error);
        }
    },

    async handleRules(bot, msg) {
        const chatId = msg.chat.id;
        try {

            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const config = await getConfig();

            // Create inline keyboard
            const keyboard = {
                inline_keyboard: [
                    [{
                        text: config.messages.viewRules,
                        url: config.rulesLink
                    }]
                ]
            };

            // Send rules message with inline button
            await bot.sendMessage(chatId, config.messages.rulesMessage, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in handleRules:', error);
        }
    },

    async handleAddAccount(bot, msg) {
        const chatId = msg.chat.id;
        try {

            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const config = await getConfig();


            // Check user role
            const user = await User.findOne({ telegramId: msg.from.id });
            if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
                return;
            }

            const keyboard = {
                inline_keyboard: [
                    [{
                        text: config.messages.enterPortal,
                        web_app: { url: config.addAccountWebAppUrl }
                    }]
                ]
            };

            await bot.sendMessage(chatId, config.messages.addAccountMessage, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in handleAddAccount:', error);
        }
    },

    async handleUserAccount(bot, msg) {
        const chatId = msg.chat.id;
        try {
            // Check rate limit
            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const user = await User.findOne({ telegramId: msg.from.id });
            if (!user) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.userNotFound);
            }

            const config = await getConfig();

            // Create message with user account info
            const message = config.messages.userAccountInfo
                .replace('{telegramId}', user.telegramId)
                .replace('{userId}', user.telegramId)
                .replace('{firstName}', user.firstName)
                .replace('{balance}', user.balance.toLocaleString('fa-IR'))
                .replace('{purchasedAccountsCount}', user.purchasedAccountsCount.toLocaleString('fa-IR'))
                .replace('{joinDate}', formatJalaliDate(user.createdAt));

            // Create inline keyboard with view purchased accounts button
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.viewPurchasedAccounts, callback_data: 'view_purchased_accounts' }]
                ]
            };

            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: keyboard
            });
        } catch (error) {
            logger.error('Error in handleUserAccount:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.accountError);
        }
    },

    async handleCheckNumber(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const config = await getConfig();
            const countries = await AllowedCountryForSell.find({ isActive: true });

            if (!countries || countries.length === 0) {
                return bot.sendMessage(chatId, config.messages.noAccountsAvailable);
            }

            // Create header row using messages from config
            const headerRow = [
                {
                    text: config.messages.tableHeaderCountry,
                    callback_data: 'just_for_header'
                },
                {
                    text: config.messages.tableHeaderPrice,
                    callback_data: 'just_for_header'
                },
                {
                    text: config.messages.tableHeaderCount,
                    callback_data: 'just_for_header'
                }
            ];

            // Create buttons
            const buttons = [headerRow]; // Add header row first
            for (const country of countries) {
                // Get available accounts count
                const accounts = await Account.find({
                    cleanSessions: true,
                    isSolded: false
                });

                // Filter accounts by country code
                const accountCount = accounts.filter(account => {
                    try {
                        const phoneNumber = parsePhoneNumberFromString(account.phone);
                        return phoneNumber.countryCallingCode === country.countryCode;
                    } catch (error) {
                        return false;
                    }
                }).length;

                buttons.push([
                    {
                        text: country.countryName,
                        callback_data: 'just_for_header'
                    },
                    {
                        text: `${country.price.toLocaleString('fa-IR')} تومان`,
                        callback_data: 'just_for_header'
                    },
                    {
                        text: `${accountCount.toLocaleString('fa-IR')} عدد`,
                        callback_data: 'just_for_header'
                    }
                ]);
            }


            await bot.sendMessage(chatId, config.messages.accountInquiry, {
                reply_markup: {
                    inline_keyboard: buttons
                },
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in handleCheckNumber:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    },

    async handleWallet(bot, msg) {
        const chatId = msg.chat.id;
        try {
            // Check rate limit
            const isAllowed = await rateLimiter(msg.from.id);
            if (!isAllowed) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.rateLimitMessage, {
                    parse_mode: 'Markdown'
                });
            }

            const user = await User.findOne({ telegramId: msg.from.id });
            if (!user) {
                const config = await getConfig();
                return bot.sendMessage(chatId, config.messages.userNotFound);
            }

            const config = await getConfig();

            // Create message with wallet info
            const message = config.messages.walletInfo
                .replace('{balance}', user.balance.toLocaleString('fa-IR'))
                .replace('{totalDeposit}', (user.totalDeposit || 0).toLocaleString('fa-IR'))
                .replace('{totalPurchases}', (user.totalPurchases || 0).toLocaleString('fa-IR'))
                .replace('{purchasedAccountsCount}', (user.purchasedAccountsCount || 0).toLocaleString('fa-IR'))
                .replace('{lastDepositDate}', formatJalaliDate(user.lastDepositDate) || config.messages.noDepositYet)
                .replace('{lastPurchaseDate}', formatJalaliDate(user.lastPurchaseDate) || config.messages.noPurchaseYet);

            // Create inline keyboard with increase balance button
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.increaseBalance, callback_data: 'increase_balance' }]
                ]
            };

            await bot.sendMessage(chatId, message, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in handleWallet:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    },

    async handleBankGateway(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const config = await getConfig();

            if (!config.paymentMethods?.bankGateway) {
                return bot.sendMessage(chatId, config.messages.bankGatewayDisabled, {
                    parse_mode: 'Markdown'
                });
            }

            // Logic for handling bank gateway payment
            // ...

        } catch (error) {
            logger.error('Error in handleBankGateway:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    },

    async handleCrypto(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const config = await getConfig();

            if (!config.paymentMethods?.crypto?.enabled) {
                return bot.sendMessage(chatId, config.messages.cryptoDisabled, {
                    parse_mode: 'Markdown'
                });
            }

            // Create keyboard with back button
            const keyboard = {
                keyboard: [
                    [config.messages.backToMainMenu]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            };

            // Send instructions
            await bot.sendMessage(
                chatId,
                config.messages.cryptoInstructions
                    .replace('{walletAddress}', config.paymentMethods.crypto.walletAddress)
                    .replace('{network}', config.paymentMethods.crypto.network)
                    .replace('{minAmount}', config.paymentMethods.crypto.minAmount.toLocaleString('fa-IR'))
                    .replace('{currencyName}', config.paymentMethods.crypto.currencyName),
                {
                    reply_markup: keyboard,
                    parse_mode: 'Markdown'
                }
            );

            // Set user state to waiting for transaction hash
            await User.findOneAndUpdate(
                { telegramId: msg.from.id },
                { $set: { waitingForTransactionHash: true } }
            );

        } catch (error) {
            logger.error('Error in handleCrypto:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    },

    async handleTransactionHash(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const user = await User.findOne({ telegramId: msg.from.id });

            if (user?.waitingForTransactionHash) {

                // Save transaction to database
                const config = await getConfig();

                if (msg.text === config.messages.backToMainMenu) {
                    console.log("back to main menu");
                    await User.findOneAndUpdate(
                        { telegramId: msg.from.id },
                        { $set: { waitingForTransactionHash: false } }
                    );
                    return;
                }

                const transactionHash = msg.text;

                await CryptoTransaction.create({
                    userId: user._id,
                    transactionHash,
                    currency: config.paymentMethods.crypto.currencyName,
                    network: config.paymentMethods.crypto.network
                });

                // Reset user state
                await User.findOneAndUpdate(
                    { telegramId: msg.from.id },
                    { $set: { waitingForTransactionHash: false } }
                );

                await bot.sendMessage(chatId, config.messages.transactionHashReceived);
            }
        } catch (error) {
            logger.error('Error handling transaction hash:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.invalidTransactionHash);
        }
    },

    async handleCardToCard(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const config = await getConfig();

            if (!config.paymentMethods?.cardToCard?.enabled) {
                return bot.sendMessage(chatId, config.messages.cardToCardDisabled, {
                    parse_mode: 'Markdown'
                });
            }

            // Create keyboard with back button
            const keyboard = {
                keyboard: [
                    [config.messages.backToMainMenu]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            };

            // Send instructions
            await bot.sendMessage(
                chatId,
                config.messages.cardToCardInstructions
                    .replace('{cardNumber}', config.cardToCard?.cardNumber)
                    .replace('{cardHolder}', config.cardToCard?.cardHolder)
                    .replace('{minAmount}', config.cardToCard?.minAmount.toLocaleString('fa-IR')),
                {
                    reply_markup: keyboard,
                    parse_mode: 'Markdown'
                }
            );

            // Set user state to waiting for receipt
            await User.findOneAndUpdate(
                { telegramId: msg.from.id },
                { $set: { waitingForReceipt: true } }
            );

        } catch (error) {
            logger.error('Error in handleCardToCard:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    },

    async handlePhoto(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const user = await User.findOne({ telegramId: msg.from.id });

            if (user?.waitingForReceipt) {

                const config = await getConfig();

                const photo = msg.photo[msg.photo.length - 1];
                const fileId = photo.file_id;
                // Save receipt to database
                await PaymentReceipt.create({
                    userId: user._id,
                    receiptPhoto: fileId,
                    status: 'pending'
                });

                // Reset user state
                await User.findOneAndUpdate(
                    { telegramId: msg.from.id },
                    { $set: { waitingForReceipt: false } }
                );

                await bot.sendMessage(chatId, config.messages.receiptReceived);
            }
        } catch (error) {
            logger.error('Error handling photo:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.invalidReceipt);
        }
    },

    async handleBuyAccount(bot, msg) {
        const chatId = msg.chat.id;
        try {
            const config = await getConfig();

            // Create inline keyboard with accept button
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.acceptTerms, callback_data: 'accept_terms' }]
                ]
            };

            // Send terms message
            await bot.sendMessage(chatId, config.messages.accountPurchaseTerms, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logger.error('Error in handleBuyAccount:', error);
            const config = await getConfig();
            await bot.sendMessage(chatId, config.messages.error);
        }
    }
};



export default commands; 