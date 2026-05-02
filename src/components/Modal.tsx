import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                <div className={`relative bg-white dark:bg-slate-800/90 dark:backdrop-blur-md rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700/50`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] text-slate-700 dark:text-slate-200">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
