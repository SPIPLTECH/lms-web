import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
import { ChatProvider } from "@/context/ChatContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConfirmProvider } from "@/context/ConfirmContext";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Serif (font-serif) and mono (code) are secondary faces that most pages never
// render, so they load on use instead of being preloaded on every page (~73KB
// of high-priority font downloads competing with the page's own content).
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Orange LMS",
  description: "Learning Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} ${sourceSerif4.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <NotificationProvider>
                    <ChatProvider>
                      {children}
                    </ChatProvider>
                  </NotificationProvider>
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
