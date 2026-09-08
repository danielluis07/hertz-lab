import { IBM_Plex_Mono, IBM_Plex_Sans, Inter } from "next/font/google";

// The Storefront's two faces (docs/DESIGN.md). Plex Sans is a variable font, so
// it takes no weight; Plex Mono is not, so its two weights are listed.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

// The admin's only face. It does not claim --font-sans: the `admin` class in
// globals.css points --font-sans at it for that subtree alone (ADR-0027).
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
