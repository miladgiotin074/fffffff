import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const formatPhoneNumber = (phone: string): string => {
    const phoneNumber = parsePhoneNumberFromString(phone, 'IR');
    return phoneNumber?.formatInternational() || phone;
};

export const isValidPhoneNumber = (phone: string): boolean => {
    const phoneNumber = parsePhoneNumberFromString(phone, 'IR');
    return phoneNumber?.isValid() || false;
}; 