import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PasturePilot - AI Farming Assistant',
  description: 'AI-first mobile farming assistant for regenerative livestock producers',
  keywords: ['farming', 'agriculture', 'AI', 'livestock', 'sheep', 'regenerative'],
  authors: [{ name: 'PasturePilot Team' }],
  creator: 'PasturePilot',
  publisher: 'PasturePilot',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PasturePilot',
  },
  openGraph: {
    type: 'website',
    siteName: 'PasturePilot',
    title: 'PasturePilot - AI Farming Assistant',
    description: 'AI-first mobile farming assistant for regenerative livestock producers',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'PasturePilot Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PasturePilot - AI Farming Assistant',
    description: 'AI-first mobile farming assistant for regenerative livestock producers',
    images: ['/icon-512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3a9f3a' },
    { media: '(prefers-color-scheme: dark)', color: '#2d7f2d' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full farming-gradient`}>
        <div className="min-h-screen safe-top safe-bottom">
          {children}
        </div>
      </body>
    </html>
  )
}