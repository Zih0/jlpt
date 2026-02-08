"use client";

import "@/styles/globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/vocabulary", label: "단어" },
  { href: "/grammar", label: "문법" },
  { href: "/kanji", label: "한자" },
  { href: "/reading", label: "독해" },
  { href: "/listening", label: "듣기" },
  { href: "/analytics", label: "학습 분석" },
  { href: "/settings", label: "설정" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <title>JLPT N1 Study</title>
      </head>
      <body>
        <header
          className="sticky top-0 z-10 border-b px-4 sm:px-6"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="max-w-container mx-auto flex items-center justify-between h-14">
            <Link
              href="/"
              className="text-h3 font-bold shrink-0"
              style={{ color: "var(--primary)" }}
            >
              JLPT N1
            </Link>
            <nav className="flex gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap"
                    style={{
                      color: active
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                      backgroundColor: active
                        ? "var(--primary-light)"
                        : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main
          className={`mx-auto px-4 sm:px-6 py-6 ${
            pathname?.startsWith("/listening")
              ? "max-w-container-wide"
              : "max-w-container"
          }`}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
