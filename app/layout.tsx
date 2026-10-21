import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans, Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { UnofficialBar, UnofficialFooter } from "@/components/Molesis";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Ballot fonts (see lib/ballot-theme.ts); only election pages use them, so no preload
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"], preload: false });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["700"], preload: false });
const robotoCondensed = Roboto_Condensed({ variable: "--font-roboto-condensed", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "The VoTer GuidEr — Know Your Whole Ballot",
  description: "An unofficial, independent voter guide (not a government site). Every race and measure on your ballot, sourced from official election offices, with a quiz comparing candidates’ stated positions. Build and share your voter guide.",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} ${roboto.variable} ${robotoCondensed.variable} antialiased`}
      >
        <UnofficialBar />
        <Header />
        {children}
        <UnofficialFooter />
      </body>
    </html>
  );
}
