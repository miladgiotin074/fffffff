import moment from 'moment-jalaali';
import 'moment-timezone';

export function formatJalaliDate(date) {
    if (date) {
        const dateInTehran = moment.utc(date).tz('Asia/Tehran');
        const formattedDate = dateInTehran.format('jYYYY/jMM/jDD');
        return convertToPersianNumbers(formattedDate);
    } else {
        return null;
    }
}

function convertToPersianNumbers(input) {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return input.replace(/\d/g, m => persianNumbers[m]);
}