import { getConfig } from '../config/config.js';
import logger from '../config/logger.js';
import { checkUserMembership } from '../utils/membershipUtils.js';
import Channel from '../models/channel.model.js';
import AllowedCountryForSell from '../models/allowedCountryForSell.model.js';
import Account from '../models/account.model.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import User from '../models/user.model.js';
import { TelegramAccountManager } from '../utils/telegramUtils.js';
import { message } from 'telegram/client/index.js';

const callbacks = {
    async check_membership(bot, query) {
        try {
            const config = await getConfig();
            const channels = await Channel.find({ isActive: true });
            const isMember = await checkUserMembership(bot, query.from.id, channels);

            if (isMember) {
                try {
                    // Try to delete the previous message
                    await bot.deleteMessage(query.message.chat.id, query.message.message_id);
                } catch (deleteError) {
                    // Ignore if message is already deleted
                    if (deleteError.response?.error_code !== 400) {
                        throw deleteError;
                    }
                }

                // Send welcome message
                await bot.sendMessage(
                    query.message.chat.id,
                    config.messages.start.replace('{firstName}', query.from.first_name),
                    {
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                await bot.answerCallbackQuery(query.id, {
                    text: config.messages.notMemberAlert,
                    show_alert: true
                });
            }
        } catch (error) {
            logger.error('Error in check_membership callback:', error);
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.membershipCheckError,
                show_alert: true
            });
        }
    },

    async just_for_header(bot, query) {
        try {
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.displayOnlyButton,
                show_alert: false
            });
        } catch (error) {
            logger.error('Error in just_for_header callback:', error);
        }
    },

    async increase_balance(bot, query) {
        try {
            const config = await getConfig();

            // Try to delete the previous message
            try {
                await bot.deleteMessage(query.message.chat.id, query.message.message_id);
            } catch (deleteError) {
                // Ignore if message is already deleted
                if (deleteError.response?.error_code !== 400) {
                    throw deleteError;
                }
            }

            // Create keyboard with payment methods
            const keyboard = {
                keyboard: [
                    [config.messages.cardToCard, config.messages.crypto],
                    [config.messages.bankGateway],
                    [config.messages.backToMainMenu]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            };

            // Send message with payment options
            await bot.sendMessage(
                query.message.chat.id,
                config.messages.increaseBalanceMessage,
                {
                    reply_markup: keyboard,
                    parse_mode: 'Markdown'
                }
            );

            // Answer the callback query
            await bot.answerCallbackQuery(query.id);
        } catch (error) {
            logger.error('Error in increase_balance callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async accept_terms(bot, query) {
        try {
            const config = await getConfig();

            // Get active countries with available accounts
            const activeCountries = await AllowedCountryForSell.find({ isActive: true });
            const availableCountries = [];

            for (const country of activeCountries) {
                console.log(country);
                const accounts = await Account.find({
                    cleanSessions: true,
                    isSolded: false
                });
                console.log(accounts);
                const availableAccounts = accounts.filter(account => {
                    try {
                        const phoneNumber = parsePhoneNumberFromString(account.phone);
                        return phoneNumber.countryCallingCode === country.countryCode;
                    } catch (error) {
                        return false;
                    }
                });
                console.log(availableAccounts);
                if (availableAccounts.length > 0) {
                    availableCountries.push({
                        countryCode: country.countryCode,
                        countryName: country.countryName,
                        price: country.price
                    });
                }
            }

            if (availableCountries.length === 0) {
                return bot.editMessageText(config.messages.noAccountsAvailableForPurchase, {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                });
            }

            // Create inline keyboard with available countries
            const keyboard = {
                inline_keyboard: availableCountries.map(country => [
                    {
                        text: config.messages.countrySelection
                            .replace('{countryName}', country.countryName)
                            .replace('{price}', country.price.toLocaleString('fa-IR')),
                        callback_data: `select_country_${country.countryCode}`
                    }
                ])
            };

            await bot.editMessageText(config.messages.termsAccepted, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error in accept_terms callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async select_country(bot, query) {
        try {
            const config = await getConfig();
            const countryCode = query.data.split('_')[2];

            // Check if country is active for sell
            const country = await AllowedCountryForSell.findOne({
                countryCode,
                isActive: true
            });

            if (!country) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.countryNotAvailable,
                    show_alert: true
                });
            }

            // Find available accounts
            const accounts = await Account.find({
                cleanSessions: true,
                isSolded: false
            });

            // Find first available account for the selected country
            const account = accounts.find(acc => {
                try {
                    const phoneNumber = parsePhoneNumberFromString(acc.phone);
                    return phoneNumber.countryCallingCode === country.countryCode;
                } catch (error) {
                    return false;
                }
            });

            if (!account) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.noAccountsAvailableForCountry,
                    show_alert: true
                });
            }

            // Check user balance
            const user = await User.findOne({ telegramId: query.from.id });
            if (user.balance < country.price) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.insufficientBalance,
                    show_alert: true
                });
            }

            // Create confirmation message
            const message = config.messages.confirmPurchase
                .replace('{countryName}', country.countryName)
                .replace('{price}', country.price.toLocaleString('fa-IR'));

            // Create inline keyboard with confirm button
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.confirmPurchaseButton, callback_data: `confirm_purchase_${countryCode}` }]
                ]
            };

            // Edit the message with confirmation
            await bot.editMessageText(message, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error in select_country callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async confirm_purchase(bot, query) {
        try {
            const config = await getConfig();
            const countryCode = query.data.split('_')[2];

            const country = await AllowedCountryForSell.findOne({
                countryCode,
                isActive: true
            });

            if (!country) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.countryNotAvailable,
                    show_alert: true
                });
            }

            // Find available accounts
            const accounts = await Account.find({
                cleanSessions: true,
                isSolded: false
            });

            // Find first available account for the selected country
            const account = accounts.find(acc => {
                try {
                    const phoneNumber = parsePhoneNumberFromString(acc.phone);
                    return phoneNumber.countryCallingCode === country.countryCode;
                } catch (error) {
                    return false;
                }
            });

            if (!account) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.noAccountsAvailableForCountry,
                    show_alert: true
                });
            }

            const user = await User.findOne({ telegramId: query.from.id });

            // Check balance again
            if (user.balance < country.price) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.insufficientBalance,
                    show_alert: true
                });
            }

            // Update user balance and mark account as sold
            const updatedUser = await User.findByIdAndUpdate(user._id, {
                $inc: {
                    balance: -country.price,
                    purchasedAccountsCount: 1,
                    totalPurchases: country.price
                },
                lastPurchaseDate: new Date()
            }, { new: true });

            await Account.findByIdAndUpdate(account._id, {
                isSolded: true,
                soldAt: new Date(),
                soldTo: user._id
            });

            // Create success message
            const message = config.messages.purchaseSuccessMessage
                .replace('{countryName}', country.countryName)
                .replace('{phoneNumber}', account.phone)
                .replace('{newBalance}', updatedUser.balance.toLocaleString('fa-IR'));

            // Create inline keyboard with get code button
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.getCodeButton, callback_data: `get_code_${account._id}` }]
                ]
            };

            // Send success message
            await bot.editMessageText(message, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error in confirm_purchase callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async get_code(bot, query) {
        try {
            const config = await getConfig();
            const accountId = query.data.split('_')[2];

            const account = await Account.findById(accountId);
            if (!account) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.accountNotFound,
                    show_alert: true
                });
            }

            //آیا ربات به اکانت لاگین هست؟
            if (!account.isLoggedIn) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.accountNotLoggedIn,
                    show_alert: true
                });
            }

            //گرفتن اطلاعات یوزر
            const user = await User.findOne({ telegramId: query.from.id });
            console.log(user);
            //بررسی مالکیت اکانت
            if (account.soldTo.toString() !== user._id.toString()) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.accountNotSold,
                    show_alert: true
                });
            }

            // بررسی تعداد درخواست‌ها
            if (account.totalCodeRequests >= config.maxCodeRequests) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.codeRequestLimitReached.replace('{maxCodeRequests}', config.maxCodeRequests),
                    show_alert: true
                });
            }

            // به‌روزرسانی تعداد درخواست‌ها
            await Account.findByIdAndUpdate(accountId, {
                $inc: { totalCodeRequests: 1 },
                lastCodeRequestDate: new Date()
            });

            // اتصال به تلگرام و دریافت کد
            const telegramManager = new TelegramAccountManager(accountId);
            const codeInfo = await telegramManager.getLatestCode();
            await telegramManager.disconnect();

            if (!codeInfo) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.noCodeFound,
                    show_alert: true
                });
            }

            // ایجاد پیام با استفاده از پیام کانفیگ
            const message = config.messages.codeMessage
                .replace('{phone}', account.phone)
                .replace('{code}', codeInfo.code)
                .replace('{password}', account.password || 'ندارد');

            // ایجاد کیبورد با استفاده از پیام کانفیگ
            const keyboard = {
                inline_keyboard: [
                    [{ text: config.messages.logoutButton, callback_data: `logout_account_${accountId}` }]
                ]
            };

            // ویرایش پیام قبلی
            await bot.editMessageText(message, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error in get_code callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async view_purchased_accounts(bot, query) {
        try {
            const config = await getConfig();
            const user = await User.findOne({ telegramId: query.from.id });

            if (!user) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.userNotFound,
                    show_alert: true
                });
            }

            // Get purchased accounts
            const accounts = await Account.find({ soldTo: user._id });

            if (accounts.length === 0) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.noPurchasedAccounts,
                    show_alert: true
                });
            }

            // Create message with purchased accounts list
            const message = config.messages.purchasedAccountsList;

            // Create inline keyboard with purchased accounts
            const keyboard = {
                inline_keyboard: accounts.map(account => [
                    {
                        text: config.messages.purchasedAccountButton.replace('{phoneNumber}', account.phone),
                        callback_data: `account_details_${account._id}`
                    }
                ])
            };

            await bot.editMessageText(message, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });

        } catch (error) {
            logger.error('Error in view_purchased_accounts callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.error,
                show_alert: true
            });
        }
    },

    async logout_account(bot, query) {
        try {
            const config = await getConfig();
            const accountId = query.data.split('_')[2];

            const account = await Account.findById(accountId);
            if (!account.isLoggedIn) {
                return bot.answerCallbackQuery(query.id, {
                    text: config.messages.accountNotLoggedIn,
                    show_alert: true
                });
            }

            const telegramManager = new TelegramAccountManager(accountId);
            await telegramManager.logout();
            await telegramManager.disconnect();

            await bot.answerCallbackQuery(query.id, {
                text: config.messages.logoutSuccess,
                show_alert: true
            });

        } catch (error) {
            logger.error('Error in logout_account callback:', error);
            const config = await getConfig();
            await bot.answerCallbackQuery(query.id, {
                text: config.messages.logoutError,
                show_alert: true
            });
        }
    },
};

export default callbacks; 