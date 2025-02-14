import { useNavigate } from 'react-router-dom';
import { backButton } from '@telegram-apps/sdk-react';
import { PropsWithChildren, useEffect, useCallback } from 'react';

export function TgPage({ children, back = true }: PropsWithChildren<{
    /**
     * True if it is allowed to go back from this page.
     */
    back?: boolean
}>) {
    const navigate = useNavigate();

    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    useEffect(() => {
        if (back) {
            backButton.show();
            return backButton.onClick(handleBack);
        }
        backButton.hide();
    }, [back, handleBack]);

    return <>{children}</>;
}