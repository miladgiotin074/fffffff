import { useState, useEffect } from 'react';
import { LoaderCircle, Send, Check, Key, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { telegramService } from '@/services/telegramService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/utils/api';
// import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { TgPage } from '@/components/TgPage';
import { backButton } from '@telegram-apps/sdk-react';
import { useNavigate } from 'react-router-dom';

// Add validation schemas
const phoneSchema = z.object({
    phone: z.string().min(11, 'شماره تلفن باید حداقل 11 رقم باشد')
});

const codeSchema = z.object({
    code: z.string().min(5, 'کد تایید باید حداقل 5 رقم باشد')
});

const passwordSchema = z.object({
    password: z.string().min(6, 'رمز عبور باید حداقل 6 کاراکتر باشد')
});

// تابع تبدیل خطا به پیام فارسی
const getFarsiErrorMessage = (error: string): string => {
    const errorMessages: { [key: string]: string } = {
        'PHONE_NUMBER_INVALID': 'شماره تلفن وارد شده نامعتبر است',
        'PHONE_NUMBER_BANNED': 'شماره تلفن شما در تلگرام مسدود شده است',
        'PHONE_NUMBER_FLOOD': 'شما درخواست کد را بیش از حد ارسال کرده‌اید',
        'PHONE_PASSWORD_FLOOD': 'شما بیش از حد مجاز برای ورود تلاش کرده‌اید',
        'PHONE_CODE_EXPIRED': 'کد تایید منقضی شده است',
        'API_ID_INVALID': 'شناسه API نامعتبر است',
        'NETWORK': 'خطا در اتصال به شبکه',
        'SESSION_PASSWORD_NEEDED': 'رمز عبور دو مرحله‌ای مورد نیاز است',
        'PHONE_CODE_INVALID': 'کد تایید وارد شده نامعتبر است',
        'PASSWORD_HASH_INVALID': 'رمز عبور وارد شده نامعتبر است',
        'AUTH_KEY_UNREGISTERED': 'کلید احراز هویت ثبت نشده است',
        'AUTH_KEY_INVALID': 'کلید احراز هویت نامعتبر است',
        'USER_DEACTIVATED': 'حساب کاربری غیرفعال شده است',
        'SESSION_REVOKED': 'نشست شما منقضی شده است',
        'SESSION_EXPIRED': 'نشست شما منقضی شده است',
        'FLOOD_WAIT_': 'شما بیش از حد مجاز تلاش کرده‌اید',
        'FLOOD': 'شما بیش از حد مجاز تلاش کرده‌اید',
        'API_ID_PUBLISHED_FLOOD': 'این شناسه API در جایی منتشر شده و اکنون نمی‌توانید از آن استفاده کنید',
        'AUTH_RESTART': 'لطفاً فرآیند احراز هویت را مجدداً شروع کنید',
        'AUTH_RESTART_%d': 'خطای داخلی (اطلاعات دیباگ %d)، لطفاً فراخوانی متد را تکرار کنید',
        'PHONE_NUMBER_APP_SIGNUP_FORBIDDEN': 'شما نمی‌توانید با این برنامه ثبت نام کنید',
        'PHONE_PASSWORD_PROTECTED': 'این شماره تلفن با رمز عبور محافظت می‌شود',
        'SMS_CODE_CREATE_FAILED': 'خطا در ایجاد کد SMS',
        'UPDATE_APP_TO_LOGIN': 'لطفاً برای ورود، کلاینت خود را به‌روزرسانی کنید',
        'ACCOUNT_EXISTS': 'این شماره تلفن قبلاً در سیستم ثبت شده است',
    };

    // جستجو در متن خطا برای یافتن کد خطا
    for (const [code, message] of Object.entries(errorMessages)) {
        if (error.includes(code)) {
            return message;
        }
    }

    return error || 'خطای ناشناخته رخ داده است';
};

// Update the CountryWarningModal component
const CountryWarningModal = ({
    isOpen,
    onConfirm,
    allowedCountries,
    userRole,
    onClose
}: {
    isOpen: boolean;
    onConfirm: () => void;
    allowedCountries: Array<{ countryCode: string; countryName: string }>;
    userRole: 'moderator' | 'admin' | null;
    onClose: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 rtl bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4">⚠️ کشور غیر مجاز</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="text-black mb-4 text-right text-telegram-header bg-gray-100 rounded-lg rtl py-3 px-2 py-0.5 mr-2">
                    <div className="pr-2 mb-2">کشورهای مجاز:</div>
                    {allowedCountries.length > 0 ? (
                        <div className='grid grid-cols-3 gap-2 pb-2'>
                            {allowedCountries.map(c => (
                                <div key={c.countryCode} className="bg-green-200 flex justify-between rounded-full rtl px-2 py-0.5 mr-2 text-black">
                                    <span className=''>{c.countryName}</span>
                                    <span>({c.countryCode}+)</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-red-600 font-bold">در حال حاظر هیچ کشوری مجاز نیست!</div>
                    )}
                </div>
                {userRole === 'admin' && (
                    <p className="text-green-700 font-bold mb-4">
                        به عنوان <span className="text-red-600">مالک اصلی ربات</span> می‌توانید ادامه دهید، اما این کشور به لیست کشورهای مجاز اضافه نخواهد شد.
                    </p>
                )}
                <div className="flex justify-center gap-2">
                    {userRole === 'admin' && (
                        <button
                            onClick={() => onConfirm()}
                            className="bg-telegram-header text-white px-4 py-2 rounded"
                        >
                            تایید و ادامه
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-telegram-header text-white px-4 py-2 rounded"
                    >
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

function Login() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'phone' | 'code' | 'password' | 'success'>('phone');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneCodeHash, setPhoneCodeHash] = useState<string | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [showCountryWarning, setShowCountryWarning] = useState(false);
    const [allowedCountries, setAllowedCountries] = useState<Array<{ countryCode: string; countryName: string }>>([]);
    const [userRole, setUserRole] = useState<'moderator' | 'admin' | null>(null);
    const [showBackConfirmation, setShowBackConfirmation] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(
            step === 'phone' ? phoneSchema :
                step === 'code' ? codeSchema :
                    passwordSchema
        )
    });

    useEffect(() => {
        console.log("step:", step);
        if (step === 'phone') {
            backButton.show();
        } else if (step === 'code') {
            backButton.hide();
        } else if (step === 'password') {
            backButton.hide();
        } else if (step === 'success') {
            backButton.hide();
        }
    }, [step]);

    const handlePhoneSubmit = async (phone: string) => {
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        console.log("formattedPhone:", formattedPhone);
        setPhone(formattedPhone);
        setLoading(true);
        setError(null);

        try {
            const phoneNumber = parsePhoneNumberFromString(formattedPhone);

            if (!phoneNumber || !phoneNumber.isValid()) {
                throw new Error('PHONE_NUMBER_INVALID');
            }

            const countryCode = phoneNumber.countryCallingCode;
            console.log("Extracted country code:", countryCode);

            const { data } = await api.post<{
                allowed: boolean;
                allowedCountries: Array<{ countryCode: string; countryName: string }>;
                userRole?: 'moderator' | 'admin';
                accountExists?: boolean;
            }>('/check-country-for-add', { countryCode, phone: formattedPhone });

            console.log(data);

            // // اگر خطای 400 باشد، data حاوی پیام خطا خواهد بود
            // if (data.error === 'ACCOUNT_EXISTS') {
            //     throw new Error('ACCOUNT_EXISTS');
            // }

            setUserRole(data.userRole || "moderator");

            if (!data.allowed && data.userRole !== 'admin') {
                setLoading(false);
                setAllowedCountries(data.allowedCountries);
                setShowCountryWarning(true);
                return;
            }

            if (!data.allowed && data.userRole === 'admin') {
                setAllowedCountries(data.allowedCountries);
                setShowCountryWarning(true);
                return;
            }

            await handleSendCode();

        } catch (err: any) {
            let errorMessage;
            if (err.error) {
                // اگر خطای 400 باشد، از err.error استفاده می‌کنیم
                errorMessage = getFarsiErrorMessage(err.error);
            } else {
                // برای سایر خطاها مانند قبل عمل می‌کنیم
                errorMessage = getFarsiErrorMessage(err.message);
            }
            console.log("errorMessage:", errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (code: string) => {
        if (!phoneCodeHash) return;

        setLoading(true);
        setError(null);

        try {
            await telegramService.signIn(phone, phoneCodeHash, code);
            const activeSessions = await telegramService.getActiveSessions();
            setSessions(activeSessions);

            // ارسال اطلاعات به سرور
            const accountData = {
                phone,
                password: '', // اگر نیاز به ذخیره پسورد باشد
                cleanSessions: activeSessions.length === 1
            };

            try {
                await telegramService.addAccountToServer(accountData);
                setStep('success');
            } catch (error: any) {
                setError(error.message);
            }
        } catch (err: any) {
            const errorMessage = getFarsiErrorMessage(err.message);
            if (err.message.includes('SESSION_PASSWORD_NEEDED')) {
                setStep('password');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (password: string) => {
        setLoading(true);
        setError(null);

        try {
            await telegramService.checkPassword(password);
            const activeSessions = await telegramService.getActiveSessions();
            setSessions(activeSessions);
            // ارسال اطلاعات به سرور
            const accountData = {
                phone,
                password: password, // اگر نیاز به ذخیره پسورد باشد
                cleanSessions: activeSessions.length === 1
            };

            try {
                await telegramService.addAccountToServer(accountData);
                setStep('success');
            } catch (error: any) {
                setError(error.message);
            }
        } catch (err: any) {
            const errorMessage = getFarsiErrorMessage(err.message);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        if (step === 'phone') {
            await handlePhoneSubmit(data.phone);
        } else if (step === 'code') {
            await handleCodeSubmit(data.code);
        } else if (step === 'password') {
            await handlePasswordSubmit(data.password);
        }
    };

    const handleCheckSessionTermination = async () => {
        setLoading(true);
        setError(null);

        try {
            // دریافت نشست‌های فعال از تلگرام
            const activeSessions = await telegramService.getActiveSessions();

            // فیلتر کردن نشست‌های غیرفعال
            const otherSessions = activeSessions.filter(session => !session.current);

            if (otherSessions.length === 0) {
                // اگر هیچ نشست فعال دیگری وجود نداشت
                // ارسال درخواست به سرور برای به‌روزرسانی cleanSessions
                await api.post('/update-sessions', {
                    phone,
                    cleanSessions: true
                });

                setError('✅ تمام نشست‌های دیگر با موفقیت خاتمه یافتند.');
                navigate('/addAccount');
            } else {
                // اگر هنوز نشست‌های فعال وجود داشت
                setError(`⚠️ هنوز ${otherSessions.length} نشست فعال دیگر وجود دارد. لطفاً آنها را خاتمه دهید.`);
            }
        } catch (err: any) {
            // در صورت بروز خطا
            const errorMessage = getFarsiErrorMessage(err.message);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const otherSessions = sessions.filter(session => !session.current);

    async function handleSendCode() {
        try {
            setLoading(true);
            setShowCountryWarning(false);
            console.log("send code to :", phone);
            const result = await telegramService.sendCode(phone);
            setPhoneCodeHash(result.phoneCodeHash);
            setStep('code');
        } catch (err: any) {
            const errorMessage = getFarsiErrorMessage(err.message);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const handleCloseWarning = () => {
        setShowCountryWarning(false);
    };

    useEffect(() => {
        const initialize = async () => {
            await telegramService.initialize();
        };
        initialize();
    }, []);

    const handleBack = () => {
        setShowBackConfirmation(true);
    };

    const handleConfirmBack = () => {
        if (step === 'code' || step === 'password') {
            setStep('phone');
            setPhoneCodeHash(null);
            setPhone('');
            telegramService.resetAuthState();
        }
        setShowBackConfirmation(false);
        setError(null);
    };

    const handleCancelBack = () => {
        setShowBackConfirmation(false);
    };

    const BackConfirmationDialog = () => {
        if (!showBackConfirmation) return null;

        return (
            <div className="fixed rtl inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold mb-4">تایید بازگشت</h3>
                    <p className="mb-6">آیا مطمئن هستید که می‌خواهید بازگردید؟ تمام اطلاعات این مرحله پاک خواهد شد.</p>
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={handleCancelBack}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        >
                            لغو
                        </button>
                        <button
                            onClick={handleConfirmBack}
                            className="bg-red-500 text-white px-4 py-2 rounded"
                        >
                            تایید و بازگشت
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <TgPage back={true}>
            <div className="p-4 bg-gray-100 flex flex-col h-screen justify-center items-center">
                <BackConfirmationDialog />
                <CountryWarningModal
                    isOpen={showCountryWarning}
                    onConfirm={() => handleSendCode()}
                    onClose={handleCloseWarning}
                    allowedCountries={allowedCountries}
                    userRole={userRole}
                />

                {step !== 'success' && (
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold">ورود به تلگرام</h1>
                    </div>
                )}
                <div className="bg-white w-full p-6 rounded-lg shadow-md">
                    <p className="text-telegram-header text-center mt-2 mb-8 rtl">
                        {step === 'phone' && (
                            <>
                                لطفاً شماره تلفن خود را وارد کنید.
                                <br />
                                کد تایید برای شما ارسال خواهد شد.
                            </>
                        )}
                        {step === 'code' && 'کد تایید ارسال شده به تلگرام خود را وارد کنید.'}
                        {step === 'password' && 'لطفاً رمز عبور دو مرحله‌ای خود را وارد کنید.'}
                    </p>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {step === 'phone' && (
                            <div className="space-y-4">

                                <div>
                                    <input
                                        type="text"
                                        placeholder="شماره تلفن (مثال: 989123456789)"
                                        {...register('phone')}
                                        className="w-full p-2 border rounded"
                                        disabled={loading}
                                    />
                                    {errors.phone && (
                                        <p className="text-red-500 text-sm mt-1 rtl">{errors.phone.message}</p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-telegram-header text-white p-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <LoaderCircle className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>ارسال کد</span>
                                            <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {step === 'code' && (
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="کد تایید 5 رقمی"
                                        {...register('code')}
                                        className="w-full p-2 border rounded"
                                        disabled={loading}
                                    />
                                    {errors.code && (
                                        <p className="text-red-500 text-sm mt-1 rtl">{errors.code.message?.toString()}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="w-1/3 bg-gray-300 text-gray-700 p-2 rounded flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>بازگشت</span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-2/3 bg-telegram-header text-white p-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <LoaderCircle className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>تایید کد</span>
                                                <Check className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'password' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="رمز عبور دو مرحله‌ای"
                                        {...register('password')}
                                        className="w-full p-2 border rounded pr-10"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 left-auto right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="w-1/3 bg-gray-300 text-gray-700 p-2 rounded flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>بازگشت</span>
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-2/3 bg-telegram-header text-white p-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <LoaderCircle className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>ارسال رمز عبور</span>
                                                <Key className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="text-center rtl">
                                <h2 className="text-xl font-bold mb-2">✅ ورود موفق!</h2>
                                <p>شما با موفقیت وارد شدید.</p>

                                {otherSessions.length === 0 ? (
                                    <div className="mt-4 space-y-4">
                                        <p>هیچ نشست فعال دیگری یافت نشد.</p>
                                        <button
                                            onClick={() => navigate('/addAccount')}
                                            className="w-full bg-telegram-header text-white p-2 rounded flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                            <span>بازگشت به افزودن حساب</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-4">
                                        <div className="bg-yellow-100 p-4 rounded-lg">
                                            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ هشدار</h3>
                                            <p className="text-yellow-700">
                                                ما <span className="font-bold text-red-600">{otherSessions.length}</span> نشست فعال دیگر پیدا کردیم.
                                                لطفاً آنها را خاتمه دهید.
                                            </p>
                                            <p className="text-yellow-700 mt-4">
                                                نکته : تا وقتی که از دیگر نشست ها لاگ اوت نکردید و یا سایر نشست ها را خاتمه ندادید مبلغی برای اکانت دریافت نخواهید کرد.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleCheckSessionTermination}
                                            className="w-full bg-telegram-header text-white p-2 rounded flex items-center justify-center gap-2"
                                        >
                                            <Shield className="w-5 h-5" />
                                            <span>بررسی خاتمه نشست</span>
                                        </button>

                                        <button
                                            onClick={() => navigate('/addAccount')}
                                            className="w-full bg-telegram-header text-white p-2 rounded flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                            <span>بازگشت به افزودن حساب</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 rtl p-2 text-center bg-red-100 text-red-600 rounded">
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </TgPage>
    );
}

export default Login;


