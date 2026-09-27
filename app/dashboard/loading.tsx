export default function DashboardLoading() {
  return (
    <div className="p-8 md:p-12 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-[7px] bg-white/5" />
          <div className="h-3 w-32 rounded-[7px] bg-white/[0.03]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 rounded-[7px] bg-slate-900/40 border border-white/5"
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-4 w-40 rounded-[7px] bg-white/5" />
          <div className="h-24 rounded-[7px] bg-slate-900/40 border border-white/5" />
          <div className="h-24 rounded-[7px] bg-slate-900/40 border border-white/5" />
        </div>
      </div>
    </div>
  );
}
