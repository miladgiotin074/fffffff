import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App';
import { isTMA, postEvent } from '@telegram-apps/bridge';
import { backButton, init, retrieveLaunchParams } from '@telegram-apps/sdk-react';

try {
  const isTelegramUser = await isTMA();

  if (isTelegramUser) {

    try {
      init();
      backButton.mount();

      const launchParams = retrieveLaunchParams();

      const headerColor = (launchParams.tgWebAppThemeParams as { header_bg_color?: string })?.header_bg_color ?? '#527da3';

      document.documentElement.style.setProperty('--telegram-header', headerColor);

      postEvent("web_app_set_header_color", { color: headerColor as `#${string}` });
      postEvent("web_app_set_bottom_bar_color", { color: headerColor as `#${string}` });

      postEvent("web_app_expand");
      postEvent("web_app_setup_closing_behavior", { need_confirmation: true });
      postEvent("web_app_setup_swipe_behavior", { allow_vertical_swipe: false });
    } catch (error) {
      console.error("error in starting app", error)
    }

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } else {
    createRoot(document.getElementById('root')!).render(
      <div className='flex justify-center items-center h-screen'>
        <h1>You are not a Telegram user</h1>
      </div>
    )
  }

} catch (e) {
  console.error("error in starting app", e)
}


