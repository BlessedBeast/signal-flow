export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 grid-bg opacity-30"
        aria-hidden
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
