import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { usePermissions } from "../hooks/usePermissions";

function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

export default function HRMSPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [tab, setTab] = useState("employees");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");

  const employeesQuery = useQuery({ queryKey: ["hrms-employees-c"], queryFn: async () => (await api.get("/employees", { params: { page: 1, limit: 200 } })).data });
  const departmentsQuery = useQuery({ queryKey: ["hrms-departments-c"], queryFn: async () => (await api.get("/hrms/departments", { params: { page: 1, limit: 200 } })).data });
  const attendanceQuery = useQuery({ queryKey: ["hrms-attendance-c"], queryFn: async () => (await api.get("/hrms/attendance", { params: { page: 1, limit: 200 } })).data });
  const leaveQuery = useQuery({ queryKey: ["hrms-leave-c"], queryFn: async () => (await api.get("/hrms/leave-requests", { params: { page: 1, limit: 200 } })).data });
  const payrollQuery = useQuery({ queryKey: ["hrms-payroll-c"], queryFn: async () => (await api.get("/hrms/payroll", { params: { page: 1, limit: 200 } })).data });
  const profileQuery = useQuery({ queryKey: ["hrms-profile-c", employeeId], enabled: !!employeeId, queryFn: async () => (await api.get(`/employees/${employeeId}`)).data });

  const clockIn = useMutation({ mutationFn: async () => api.post("/hrms/attendance/clock-in"), onSuccess: () => qc.invalidateQueries({ queryKey: ["hrms-attendance-c"] }) });
  const clockOut = useMutation({ mutationFn: async () => api.post("/hrms/attendance/clock-out"), onSuccess: () => qc.invalidateQueries({ queryKey: ["hrms-attendance-c"] }) });
  const createDept = useMutation({ mutationFn: async () => api.post("/hrms/departments", { name: departmentName }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["hrms-departments-c"] }); setDepartmentName(""); } });
  const applyLeave = useMutation({ mutationFn: async () => api.post("/hrms/leave-requests", { employeeId: employeeId || undefined, type: leaveType, from: leaveFrom || undefined, to: leaveTo || undefined }), onSuccess: () => qc.invalidateQueries({ queryKey: ["hrms-leave-c"] }) });

  const employees = rows(employeesQuery.data);
  const departments = rows(departmentsQuery.data);
  const attendance = rows(attendanceQuery.data);
  const leaves = rows(leaveQuery.data);
  const payroll = rows(payrollQuery.data);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "employees", label: "Employees" },
          { key: "departments", label: "Departments" },
          { key: "attendance", label: "Attendance" },
          { key: "leave", label: "Leave Management" },
          { key: "payroll", label: "Payroll" },
          { key: "profile", label: "Employee Profile" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "employees" ? (
        <Card>
          <CardHeader><h1 className="text-lg font-semibold">HRMS Employees</h1></CardHeader>
          <CardContent>
            {employeesQuery.isLoading ? <LoadingState message="Loading employees..." /> : null}
            {employeesQuery.isError ? <ErrorState message={extractErrorMessage(employeesQuery.error)} /> : null}
            {!employeesQuery.isLoading && !employeesQuery.isError && !employees.length ? <EmptyState message="No employees found." /> : null}
            {!employeesQuery.isLoading && !employeesQuery.isError && employees.length ? (
              <DataTable data={employees} columns={[{ accessorKey: "id", header: "Employee ID" }, { accessorKey: "name", header: "Name" }, { accessorKey: "email", header: "Email" }, { accessorKey: "phone", header: "Phone" }, { accessorKey: "role", header: "Role" }]} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "departments" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Department Management</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Department name" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
              <Button disabled={!departmentName || !can("employee.manage")} onClick={() => createDept.mutate()}>Create Department</Button>
            </div>
            {createDept.isError ? <ErrorState message={extractErrorMessage(createDept.error)} /> : null}
            <DataTable data={departments} columns={[{ accessorKey: "id", header: "Department ID" }, { accessorKey: "name", header: "Name" }, { accessorKey: "code", header: "Code" }, { accessorKey: "status", header: "Status" }]} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "attendance" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Attendance and Shift Operations</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button disabled={!can("employee.manage")} onClick={() => clockIn.mutate()}>Clock In</Button>
              <Button variant="secondary" disabled={!can("employee.manage")} onClick={() => clockOut.mutate()}>Clock Out</Button>
            </div>
            {clockIn.isError ? <ErrorState message={extractErrorMessage(clockIn.error)} /> : null}
            {clockOut.isError ? <ErrorState message={extractErrorMessage(clockOut.error)} /> : null}
            <DataTable data={attendance} columns={[{ accessorKey: "id", header: "Record" }, { accessorKey: "employeeId", header: "Employee" }, { accessorKey: "clockIn", header: "Clock In" }, { accessorKey: "clockOut", header: "Clock Out" }, { accessorKey: "status", header: "Status" }]} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "leave" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Leave Management</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <Input placeholder="Employee ID" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
              <Input placeholder="Leave type" value={leaveType} onChange={(event) => setLeaveType(event.target.value)} />
              <Input type="date" value={leaveFrom} onChange={(event) => setLeaveFrom(event.target.value)} />
              <Input type="date" value={leaveTo} onChange={(event) => setLeaveTo(event.target.value)} />
            </div>
            <Button disabled={!can("employee.manage")} onClick={() => applyLeave.mutate()}>Create Leave Request</Button>
            {applyLeave.isError ? <ErrorState message={extractErrorMessage(applyLeave.error)} /> : null}
            <DataTable data={leaves} columns={[{ accessorKey: "id", header: "Request" }, { accessorKey: "employeeId", header: "Employee" }, { accessorKey: "type", header: "Type" }, { accessorKey: "status", header: "Status" }, { accessorKey: "from", header: "From" }, { accessorKey: "to", header: "To" }]} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "payroll" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Payroll Foundation</h2></CardHeader>
          <CardContent>
            <DataTable data={payroll} columns={[{ accessorKey: "id", header: "Payroll ID" }, { accessorKey: "employeeId", header: "Employee" }, { accessorKey: "period", header: "Period" }, { accessorKey: "gross", header: "Gross" }, { accessorKey: "net", header: "Net" }, { accessorKey: "status", header: "Status" }]} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "profile" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Employee Profile</h2></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Employee ID" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
            {profileQuery.isLoading ? <LoadingState message="Loading profile..." /> : null}
            {profileQuery.isError ? <ErrorState message={extractErrorMessage(profileQuery.error)} /> : null}
            {!employeeId ? <EmptyState message="Select an employee to load profile." /> : null}
            {employeeId && profileQuery.data ? <pre className="max-h-[460px] overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">{JSON.stringify(profileQuery.data, null, 2)}</pre> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
