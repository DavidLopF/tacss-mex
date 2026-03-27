'use client';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function ConfigTableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-6 py-4 flex gap-6 border-b border-gray-100 last:border-b-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
