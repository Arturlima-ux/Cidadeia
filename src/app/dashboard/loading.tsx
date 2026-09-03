export default function DashboardLoading() {
  return (
    <div className="max-w-5xl space-y-6 animate-fade-in-up">
      <div className="h-8 w-64 rounded-lg bg-sutil animate-pulse-soft" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-sutil animate-pulse-soft" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-sutil animate-pulse-soft" />
    </div>
  );
}
