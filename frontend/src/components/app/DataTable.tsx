import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  className,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  className?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 8,
  });

  return (
    <div className={cn("rounded-lg border border-slate-200 dark:border-slate-800", className)}>
      <div className="grid grid-cols-1 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${table.getAllLeafColumns().length}, minmax(120px, 1fr))` }}>
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <button
                  key={header.id}
                  className="flex h-11 items-center gap-1 border-r border-slate-200 px-3 text-left text-xs font-semibold uppercase tracking-wide dark:border-slate-800"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {sorted === "asc" ? (
                    <ArrowUp size={14} />
                  ) : sorted === "desc" ? (
                    <ArrowDown size={14} />
                  ) : (
                    <ArrowUpDown size={14} className="opacity-50" />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div ref={parentRef} className="max-h-[520px] overflow-auto">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                className="absolute left-0 top-0 grid w-full border-b border-slate-200 text-sm dark:border-slate-800"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${table.getAllLeafColumns().length}, minmax(120px, 1fr))`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="flex min-h-[46px] items-center border-r border-slate-100 px-3 dark:border-slate-900">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
