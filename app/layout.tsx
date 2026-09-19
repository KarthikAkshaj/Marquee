import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { GrainOverlay } from "@/components/shell/GrainOverlay";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  // Added to an iPhone home screen, it opens full screen like an app.
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: BRAND.ink,
  colorScheme: "dark",
  // Lets the phone nav reach the bottom edge, padded by the safe-area inset.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      {/* Extensions (e.g. ClickUp) add classes to <body> before React hydrates.
          This only silences mismatches on body's own attributes, not its children. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
        <GrainOverlay />
        <Toaster
          theme="dark"
          position="bottom-right"
          // Clear of the phone's bottom nav and its raised + button.
          mobileOffset={{ bottom: "calc(104px + env(safe-area-inset-bottom))" }}
          toastOptions={{
            classNames: {
              toast:
                "!bg-elevated !border-border !text-text surface-highlight !rounded-card",
              description: "!text-text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
