export function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-3">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label key={option.value} className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              className="h-4 w-4"
              name="radio-group"
              checked={active}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
