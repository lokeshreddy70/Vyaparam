import { Input } from "./input";

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
}
