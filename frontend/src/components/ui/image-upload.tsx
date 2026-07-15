import { ImageUp } from "lucide-react";
import { useState } from "react";

export function ImageUpload({
  onSelect,
}: {
  onSelect: (file: File) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
      {preview ? <img src={preview} alt="Selected preview" className="h-24 w-24 rounded object-cover" /> : <ImageUp size={16} />}
      Upload image
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPreview(URL.createObjectURL(file));
          onSelect(file);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
