import { useState } from "react";
import { Accordion } from "../../components/ui/accordion";
import { Autocomplete } from "../../components/ui/autocomplete";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { DatePicker } from "../../components/ui/date-picker";
import { Dialog } from "../../components/ui/dialog";
import { Drawer } from "../../components/ui/drawer";
import { FileUpload } from "../../components/ui/file-upload";
import { ImageUpload } from "../../components/ui/image-upload";
import { Input } from "../../components/ui/input";
import { Pagination } from "../../components/ui/pagination";
import { Popover } from "../../components/ui/popover";
import { RadioGroup } from "../../components/ui/radio-group";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Spinner } from "../../components/ui/spinner";
import { Stepper } from "../../components/ui/stepper";
import { Switch } from "../../components/ui/switch";
import { Tabs } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { TimePicker } from "../../components/ui/time-picker";
import { Tooltip } from "../../components/ui/tooltip";
import { useToast } from "../../context/ToastProvider";

export default function ComponentsPage() {
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [radio, setRadio] = useState("basic");
  const [tab, setTab] = useState("controls");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { pushToast } = useToast();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Component Library</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            tabs={[
              { key: "controls", label: "Controls" },
              { key: "feedback", label: "Feedback" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "controls" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold">Form Controls</p>
                <Input placeholder="Input" />
                <Textarea placeholder="Textarea" />
                <Select defaultValue="one">
                  <option value="one">One</option>
                  <option value="two">Two</option>
                </Select>
                <Autocomplete
                  value={query}
                  onChange={setQuery}
                  options={["Settings", "Foundation", "Notifications", "Profile"]}
                  placeholder="Autocomplete"
                />
                <DatePicker value={date} onChange={setDate} />
                <TimePicker value={time} onChange={setTime} />
                <Checkbox checked={checked} onChange={setChecked} label="Checkbox" />
                <Switch checked={enabled} onChange={setEnabled} label="Switch" />
                <RadioGroup
                  value={radio}
                  onChange={setRadio}
                  options={[
                    { value: "basic", label: "Basic" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold">Navigation and Helpers</p>
                <div className="flex flex-wrap gap-2">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="danger">Danger</Button>
                  <Tooltip content="Tooltip sample">
                    <span className="rounded border border-slate-300 px-2 py-1 text-xs">Hover me</span>
                  </Tooltip>
                </div>
                <Popover trigger={<span className="rounded border border-slate-300 px-2 py-1 text-xs">Open popover</span>}>
                  <p className="text-xs">Reusable popover panel content.</p>
                </Popover>
                <Pagination page={page} totalPages={5} onPageChange={setPage} />
                <Stepper steps={["Plan", "Build", "Verify", "Release"]} active={2} />
                <FileUpload onSelect={(file) => pushToast({ kind: "info", title: "File selected", description: file.name })} />
                <ImageUpload onSelect={(file) => pushToast({ kind: "success", title: "Image selected", description: file.name })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold">Feedback</p>
                <div className="flex items-center gap-2">
                  <Badge>Badge</Badge>
                  <Spinner />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Button onClick={() => setOpenDialog(true)}>Open Dialog</Button>
                  <Button variant="secondary" onClick={() => setOpenDrawer(true)}>
                    Open Drawer
                  </Button>
                  <Button variant="outline" onClick={() => pushToast({ kind: "success", title: "Toast", description: "Toast notifications are active." })}>
                    Trigger Toast
                  </Button>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold">Accordion</p>
                <Accordion
                  items={[
                    { id: "a", title: "Accessibility", content: "Keyboard and semantic markup support." },
                    { id: "b", title: "Theming", content: "Dark mode and light mode support by class strategy." },
                    { id: "c", title: "Composition", content: "Components designed for reuse across feature modules." },
                  ]}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} title="Reusable Dialog" onClose={() => setOpenDialog(false)}>
        <p className="text-sm">This dialog is part of the global design system foundation.</p>
      </Dialog>

      <Drawer open={openDrawer} title="Reusable Drawer" onClose={() => setOpenDrawer(false)}>
        <p className="text-sm">This drawer supports responsive side-panel interactions.</p>
      </Drawer>
    </div>
  );
}
