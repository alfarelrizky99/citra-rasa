import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'script-defer',
            manifest: {
                id: '/',
                name: 'Citra Rasa Kasir',
                short_name: 'Citra Rasa',
                description: 'Aplikasi Kasir dan Pesan Antar Citra Rasa',
                theme_color: '#FBBF24',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                dir: 'ltr',
                lang: 'id-ID',
                categories: ['food', 'shopping', 'lifestyle'],
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ],
                screenshots: [
                    {
                        src: '/Foto Sampul.jpg',
                        sizes: '1280x720',
                        type: 'image/jpeg',
                        form_factor: 'wide',
                        label: 'Halaman Beranda Citra Rasa'
                    },
                    {
                        src: '/Foto Sampul.jpg',
                        sizes: '1280x720',
                        type: 'image/jpeg',
                        form_factor: 'narrow',
                        label: 'Halaman Menu Citra Rasa'
                    }
                ],
                display_override: ['window-controls-overlay', 'standalone'],
                launch_handler: {
                    client_mode: "navigate-existing"
                },
                iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
                related_applications: [
                    {
                        platform: 'play',
                        url: 'https://play.google.com/store/apps/details?id=com.citrarasa.app',
                        id: 'com.citrarasa.app'
                    }
                ],
                prefer_related_applications: false,
                shortcuts: [
                    {
                        name: 'Pesan Makanan',
                        short_name: 'Pesan',
                        description: 'Lihat menu dan pesan makanan Padang',
                        url: '/#menu',
                        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Lokasi Toko',
                        short_name: 'Lokasi',
                        description: 'Lihat rute ke Citra Rasa',
                        url: '/#location',
                        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
                    }
                ]
            },
            devOptions: {
                enabled: true
            }
        })
    ],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
    build: {
        minify: 'esbuild',
        sourcemap: false,
    },
    esbuild: {
        drop: ['console', 'debugger'],
    }
});
