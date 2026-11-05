import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-latin-wght.woff2",
  variable: "--font-sans",
  weight: "400 800",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin-wght.woff2",
  variable: "--font-display",
  weight: "500 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRISM POP — Prompt Chain Studio",
  description:
    "Write the lines the club says. Compose prompt chains, try them on a photo, and set the mix.",
};

const THEME_SCRIPT = `(function(){try{var pref=localStorage.getItem('prism-theme')||'system';var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=pref==='light'?'light':pref==='dark'?'dark':(dark?'dark':'light');document.documentElement.setAttribute('data-theme',theme);document.documentElement.setAttribute('data-theme-pref',pref);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${spaceGrotesk.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${jakarta.className} min-h-full`}>{children}</body>
    </html>
  );
}
