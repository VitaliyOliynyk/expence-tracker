import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Geometryczny grotesk - najblizszy darmowy odpowiednik kroju z referencji (Gilroy).
const urbanist = Urbanist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expence Tracker",
  description: "Modul do sledzenia wydatkow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={urbanist.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
