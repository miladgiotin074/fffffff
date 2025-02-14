import { create } from 'zustand';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

interface TelegramStore {
  client: TelegramClient | null;
  setClient: (client: TelegramClient) => void;
}

const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID);
const apiHash = import.meta.env.VITE_TELEGRAM_API_HASH;
const stringSession = new StringSession('');

export const useTelegramStore = create<TelegramStore>((set) => ({
  client: null,
  setClient: (client) => set({ client }),
}));

export const initializeClient = async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();
  return client;
}; 