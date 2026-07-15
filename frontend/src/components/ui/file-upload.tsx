import { Upload } from "lucide-react";

export function FileUpload({
  onSelect,
  accept,
}: {
  onSelect: (file: File) => void;
  accept?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
      <Upload size={14} />
      Upload file
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
