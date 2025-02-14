import AddAccount from '@/pages/AddAccount';
import Login from '@/pages/Login';
import type { ComponentType, JSX } from 'react';


interface Route {
    path: string;
    Component: ComponentType;
    title?: string;
    icon?: JSX.Element;
}

export const routes: Route[] = [
    { path: '/addAccount', Component: AddAccount },
    { path: '/login', Component: Login },
];