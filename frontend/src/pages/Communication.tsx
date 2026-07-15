import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("announcements");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [templateName, setTemplateName] = useState("");

  const announcementsQuery = useQuery({ queryKey: ["comm-announcements-c"], queryFn: async () => (await api.get("/notifications/announcements", { params: { page: 1, limit: 200 } })).data });
  const remindersQuery = useQuery({ queryKey: ["comm-reminders-c"], queryFn: async () => (await api.get("/notifications/reminders", { params: { page: 1, limit: 200 } })).data });
  const templatesQuery = useQuery({ queryKey: ["comm-templates-c"], queryFn: async () => (await api.get("/notifications/templates", { params: { page: 1, limit: 200 } })).data });

  const createAnnouncement = useMutation({
    mutationFn: async () => api.post("/notifications/announcements", { title, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm-announcements-c"] });
      setTitle("");
      setMessage("");
    },
  });

  const broadcast = useMutation({ mutationFn: async () => api.post("/notifications/broadcast", { title, message }) });
  const saveEmailTemplate = useMutation({ mutationFn: async () => api.post("/notifications/templates", { name: templateName, channel: "EMAIL", body: message }), onSuccess: () => qc.invalidateQueries({ queryKey: ["comm-templates-c"] }) });
  const saveSmsTemplate = useMutation({ mutationFn: async () => api.post("/notifications/templates", { name: templateName, channel: "SMS", body: message }), onSuccess: () => qc.invalidateQueries({ queryKey: ["comm-templates-c"] }) });

  const announcements = rows(announcementsQuery.data);
  const reminders = rows(remindersQuery.data);
  const templates = rows(templatesQuery.data);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "announcements", label: "Announcements" },
          { key: "broadcast", label: "Broadcast" },
          { key: "email-templates", label: "Email Templates" },
          { key: "sms-templates", label: "SMS Templates" },
          { key: "reminders", label: "Reminders" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card>
        <CardHeader><h1 className="text-lg font-semibold">Communication and Notification Center</h1></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title or template name" value={tab.includes("templates") ? templateName : title} onChange={(event) => (tab.includes("templates") ? setTemplateName(event.target.value) : setTitle(event.target.value))} />
          <Textarea placeholder="Message body" value={message} onChange={(event) => setMessage(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {tab === "announcements" ? <Button disabled={!title || !message} onClick={() => createAnnouncement.mutate()}>Create Announcement</Button> : null}
            {tab === "broadcast" ? <Button disabled={!title || !message} onClick={() => broadcast.mutate()}>Send Broadcast</Button> : null}
            {tab === "email-templates" ? <Button disabled={!templateName || !message} onClick={() => saveEmailTemplate.mutate()}>Save Email Template</Button> : null}
            {tab === "sms-templates" ? <Button disabled={!templateName || !message} onClick={() => saveSmsTemplate.mutate()}>Save SMS Template</Button> : null}
          </div>
          {createAnnouncement.isError ? <ErrorState message={extractErrorMessage(createAnnouncement.error)} /> : null}
          {broadcast.isError ? <ErrorState message={extractErrorMessage(broadcast.error)} /> : null}
          {saveEmailTemplate.isError ? <ErrorState message={extractErrorMessage(saveEmailTemplate.error)} /> : null}
          {saveSmsTemplate.isError ? <ErrorState message={extractErrorMessage(saveSmsTemplate.error)} /> : null}
        </CardContent>
      </Card>

      {tab === "announcements" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Announcement Logs</h2></CardHeader>
          <CardContent>
            {announcementsQuery.isLoading ? <LoadingState message="Loading announcements..." /> : null}
            {announcementsQuery.isError ? <ErrorState message={extractErrorMessage(announcementsQuery.error)} /> : null}
            {!announcementsQuery.isLoading && !announcementsQuery.isError && announcements.length ? (
              <DataTable data={announcements} columns={[{ accessorKey: "id", header: "ID" }, { accessorKey: "title", header: "Title" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} />
            ) : null}
            {!announcementsQuery.isLoading && !announcementsQuery.isError && !announcements.length ? <EmptyState message="No announcements available." /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "reminders" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Reminder Queue</h2></CardHeader>
          <CardContent>
            <DataTable data={reminders} columns={[{ accessorKey: "id", header: "ID" }, { accessorKey: "title", header: "Title" }, { accessorKey: "type", header: "Type" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} />
          </CardContent>
        </Card>
      ) : null}

      {(tab === "email-templates" || tab === "sms-templates") ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Saved Templates</h2></CardHeader>
          <CardContent>
            <DataTable data={templates} columns={[{ accessorKey: "id", header: "Template" }, { accessorKey: "name", header: "Name" }, { accessorKey: "channel", header: "Channel" }, { accessorKey: "status", header: "Status" }, { accessorKey: "updatedAt", header: "Updated" }]} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
