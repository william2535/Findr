import type { Metadata } from 'next';
import {APP_VERSION} from '../public/app/version.mjs';
import './release.css';

const releaseUrl = 'https://findr-fault-finder.floodyyy21.chatgpt.site';
const description = 'Your fire and security field kit: UK-first panel and device pictures, offline manual packs, guided fault finding and keypad practice. Open FINDR on the web or download the Android app.';

export const metadata: Metadata = {
  metadataBase: new URL(releaseUrl),
  title: 'FINDR — Fire & Security Field Kit',
  description,
  applicationName: 'FINDR',
  alternates: {canonical: releaseUrl},
  manifest: '/app/manifest.webmanifest',
  icons: {
    icon: [
      {url: '/app/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
      {url: '/app/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
    ],
    shortcut: '/app/icons/icon-192.png',
    apple: [{url: '/app/icons/icon-180.png', sizes: '180x180', type: 'image/png'}],
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: releaseUrl,
    siteName: 'FINDR',
    title: 'FINDR — Fire & Security Field Kit',
    description,
    images: [{
      url: '/share/findr-release-' + APP_VERSION + '.png',
      width: 1200,
      height: 630,
      alt: 'FINDR fire-panel logo — panel manuals, fault finding and keypad practice',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FINDR — Fire & Security Field Kit',
    description,
    images: ['/share/findr-release-' + APP_VERSION + '.png'],
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className="findr-release-body">{children}</body></html>;
}
