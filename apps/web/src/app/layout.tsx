import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAuthConfig } from "@/lib/api/server";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DIU Question Bank",
    template: "%s · DIU Question Bank",
  },
  description:
    "Browse previous exam questions from Daffodil International University.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The Google OAuth client id is static, public config. Fetch it once on the
  // server (over the API service binding) instead of making every visitor do a
  // browser round trip to `/auth/config` before sign-in can initialize. A null
  // here just means sign-in shows as unavailable — browsing still works.
  const googleClientId = await getAuthConfig().catch(() => null);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${instrumentSans.variable} ${geistMono.variable} h-full font-sans antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <AuthProvider googleClientId={googleClientId}>
              <NextTopLoader showSpinner={false} />
              {children}
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
