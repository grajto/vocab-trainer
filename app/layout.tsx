import type { Metadata } from "next";
import "./globals.css";
import { SoundProvider } from "@/src/lib/SoundProvider";
import { QueryProvider } from "./providers/QueryProvider";

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
        <QueryProvider>
          <SoundProvider>
            {children}
          </SoundProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
