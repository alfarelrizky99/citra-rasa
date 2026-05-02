import { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Column {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => ReactNode;
}

interface TableProps {
    columns: Column[];
    data: any[];
    emptyMessage?: string;
}

export default function Table({ columns, data, emptyMessage = 'Tidak ada data' }: TableProps) {
    const { darkMode } = useTheme();
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-700">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`px-4 py-3 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                                    }`}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-4 py-3 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'} ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                                            }`}
                                    >
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
