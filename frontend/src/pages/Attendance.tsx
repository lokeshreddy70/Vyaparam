import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";

type AttendanceRecord = {
  id: string;
  employeeId?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
};

export default function AttendancePage() {
  const qc = useQueryClient();

  const attendanceQuery = useQuery({
    queryKey: ["hrms-attendance"],
    queryFn: async () => (await api.get<AttendanceRecord[]>("/hrms/attendance", { params: { page: 1, limit: 100 } })).data,
  });

  const leaveQuery = useQuery({
    queryKey: ["hrms-leave-requests"],
    queryFn: async () => (await api.get<AttendanceRecord[]>("/hrms/leave-requests", { params: { page: 1, limit: 100 } })).data,
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      await api.post("/hrms/attendance/clock-in");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrms-attendance"] }),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      await api.post("/hrms/attendance/clock-out");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrms-attendance"] }),
  });

  const attendance = Array.isArray(attendanceQuery.data)
    ? attendanceQuery.data
    : ((attendanceQuery.data as { items?: AttendanceRecord[] } | undefined)?.items ?? []);
  const leaves = Array.isArray(leaveQuery.data)
    ? leaveQuery.data
    : ((leaveQuery.data as { items?: AttendanceRecord[] } | undefined)?.items ?? []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Attendance Operations</h1>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => clockIn.mutate()} disabled={clockIn.isPending}>Clock In</Button>
          <Button variant="secondary" onClick={() => clockOut.mutate()} disabled={clockOut.isPending}>Clock Out</Button>
          {clockIn.isError ? <p className="text-sm text-red-600">{extractErrorMessage(clockIn.error)}</p> : null}
          {clockOut.isError ? <p className="text-sm text-red-600">{extractErrorMessage(clockOut.error)}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Attendance Records</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            data={attendance}
            columns={[
              { accessorKey: "id", header: "Record" },
              { accessorKey: "employeeId", header: "Employee" },
              { accessorKey: "clockIn", header: "Clock In" },
              { accessorKey: "clockOut", header: "Clock Out" },
              { accessorKey: "status", header: "Status" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Leave Requests</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            data={leaves}
            columns={[
              { accessorKey: "id", header: "Request" },
              { accessorKey: "employeeId", header: "Employee" },
              { accessorKey: "status", header: "Status" },
              { accessorKey: "clockIn", header: "From" },
              { accessorKey: "clockOut", header: "To" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
