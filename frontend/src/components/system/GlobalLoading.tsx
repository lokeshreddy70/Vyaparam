import { useIsFetching } from "@tanstack/react-query";

export function GlobalLoading() {
  const isFetching = useIsFetching();
  if (!isFetching) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[130] h-1 overflow-hidden bg-sky-200/60 dark:bg-sky-900/40">
      <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-sky-600" />
    </div>
  );
}
