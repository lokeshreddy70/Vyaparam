import { Input } from "./input";

export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} />;
}
