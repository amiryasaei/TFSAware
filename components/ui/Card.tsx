export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-edge bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
