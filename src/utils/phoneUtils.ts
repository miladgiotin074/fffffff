import { parsePhoneNumber } from 'libphonenumber-js';

// Fix type errors in parsePhoneNumber calls
export const formatPhoneNumber = (phoneNumber: string) => {
  const parsedNumber = parsePhoneNumber(phoneNumber, { defaultCountry: 'IR' });
  return parsedNumber?.formatInternational() || phoneNumber;
};

export const validatePhoneNumber = (phoneNumber: string) => {
  const parsedNumber = parsePhoneNumber(phoneNumber, { defaultCountry: 'IR' });
  return parsedNumber?.isValid() || false;
}; 