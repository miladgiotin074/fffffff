import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function validatePhoneNumber(phone: string, countryCode: string) {
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    return phoneNumber?.isValid() || false;
}

export function formatPhoneNumber(phone: string, countryCode: string) {
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    return phoneNumber?.formatInternational() || phone;
}

export function getCountryCode(phone: string): string | null {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber?.countryCallingCode || null;
} 