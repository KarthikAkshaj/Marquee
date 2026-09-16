export default function HomeLoading() {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className="flex flex-1 flex-col items-center justify-center py-10 md:px-10"
    >
      <div className="h-42 w-full max-w-79.5 animate-pulse rounded-xl border border-white/10 bg-white/2" />
      <div className="mt-15.5 h-12.5 w-full max-w-105 animate-pulse rounded-card bg-surface" />
      <div className="mt-3.5 h-4.5 w-full max-w-90 animate-pulse rounded-card bg-surface" />
    </div>
  );
}
