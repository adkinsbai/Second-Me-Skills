export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#07090F" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-white/20"
          style={{ borderTopColor: "#F43F5E" }}
        />
        <p className="text-sm font-bold text-white/60">加载中…</p>
      </div>
    </div>
  );
}
