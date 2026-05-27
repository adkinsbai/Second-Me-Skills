export default function DiscoverLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#07090F" }}>
      <div className="flex w-full max-w-sm flex-col items-center gap-5 px-4">
        {/* Skeleton swipe card */}
        <div className="w-full animate-pulse overflow-hidden rounded-[2rem] border-2 border-white/10 bg-white/5">
          <div className="h-[420px] bg-white/10" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-16 rounded-full bg-white/10" />
              <div className="h-6 w-20 rounded-full bg-white/10" />
              <div className="h-6 w-14 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
        {/* Skeleton action buttons */}
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-16 w-16 animate-pulse rounded-2xl" style={{ background: "#F43F5E33" }} />
        </div>
      </div>
    </div>
  );
}
