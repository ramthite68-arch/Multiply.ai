export const metadata = {
  title: "Multiply.ai",
  description: "AI-powered communication & commerce layer for distributors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F8FAFC" }}>{children}</body>
    </html>
  );
}
