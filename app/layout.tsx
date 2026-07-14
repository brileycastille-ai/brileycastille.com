import type { Metadata } from "next";
import "./globals.css";
import "./ideas.css";
import NotificationBell from "./notification-bell";

export const metadata: Metadata = {
  metadataBase: new URL("https://brileycastille.com"),
  title: "Briley Castille | Political Journalism and Essays",
  description: "Political journalism, essays, and clear explainers by Briley Castille, a Texas A&M University-Corpus Christi freshman from Spring, Texas, participating in the Program for System Admission.",
  keywords: ["Briley Castille", "political journalist", "political journalism", "political essays", "Texas politics", "Spring Texas", "Texas A&M University-Corpus Christi", "Program for System Admission", "PSA"],
  authors: [{ name: "Briley Castille" }],
  creator: "Briley Castille",
  category: "Political Journalism",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Briley Castille | Political Journalism and Essays", description: "Understanding politics shouldn’t require picking a side.", type: "website", url: "/", siteName: "Briley Castille", locale: "en_US", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Briley Castille | Political Journalism and Essays", description: "Understanding politics shouldn’t require picking a side.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><NotificationBell/>{children}</body></html>;
}
