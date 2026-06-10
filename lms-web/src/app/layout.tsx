import "./globals.css";

export const metadata = {
  title: "Orange Tree LMS",
  description: "AI Powered LMS Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}