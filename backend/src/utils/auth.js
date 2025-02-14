import { isValid,parse } from '@telegram-apps/init-data-node';

export function validateInitData(initData, botToken) {
  try {
    return isValid(initData, botToken);
  } catch (error) {
    return false;
  }
}

export function parseInitData(initData) {
  return parse(initData);
} 