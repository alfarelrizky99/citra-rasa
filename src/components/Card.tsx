import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    title?: string;
    action?: ReactNode;
    className?: string;
}

export default function Card({ children, title, action, className = '' }: CardProps) {
    return (
        <div className={`bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-colors duration-200 text-slate-900 dark:text-slate-100 ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
}
