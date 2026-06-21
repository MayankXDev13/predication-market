export function MarketCardSkeleton() {
  return (
    <div className="bg-[#1a1a23] rounded-lg p-4 animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-4 w-16 bg-gray-700 rounded" />
        <div className="h-4 w-20 bg-gray-700 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-gray-700 rounded mb-2" />
      <div className="h-4 w-full bg-gray-700 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-gray-700 rounded-full" />
        <div className="h-6 w-16 bg-gray-700 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-700 rounded" />
      ))}
    </div>
  );
}
