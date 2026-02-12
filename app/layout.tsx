import type { Metadata } from "next";
import "./globals.css";
import { SoundProvider } from "@/src/lib/SoundProvider";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Vocab Trainer",
  description: "Vocab Trainer App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">
        <SettingsProvider>
          <SoundProvider>
            {children}
            <Toaster position="top-center" />
          </SoundProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
