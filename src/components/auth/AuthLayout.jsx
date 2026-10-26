export default function AuthLayout({
  children,
  title,
  subtitle,
}) {
  // min-h-dvh, not min-h-screen: on a phone 100vh is the height with the
  // address bar hidden, so while the bar shows the page was taller than the
  // screen and scrolled for nothing. A form taller than the screen still scrolls.
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight leading-none">
            Orange Tree LMS
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-2 text-xs sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="bg-background border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
              {title}
            </h2>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}