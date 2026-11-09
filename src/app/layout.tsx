import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Fast-Track System',
  description: 'Enterprise Freight Forwarding & Logistics Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                var scale = localStorage.getItem('uiScale') === '80' ? '80' : '100';
                document.documentElement.classList.remove('scale-80', 'scale-90', 'scale-100', 'scale-110');
                document.documentElement.classList.add('scale-' + scale);
                if (localStorage.getItem('darkMode') === 'true') {
                  document.documentElement.classList.add('dark-mode');
                }
                if (localStorage.getItem('sidebarCollapsed') === 'true') {
                  document.documentElement.classList.add('sidebar-collapsed', 'sidebar-init-collapsed');
                }
              }
            `,
          }}
        />
      </head>
      <body className={`min-h-screen w-full overflow-hidden text-gray-800 bg-slate-50 antialiased ${inter.className}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
