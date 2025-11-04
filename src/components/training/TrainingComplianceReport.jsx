import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Filter
} from "lucide-react";
import { format, parseISO, isPast, isBefore, addDays } from "date-fns";

export default function TrainingComplianceReport({ modules, assignments, staff, carers, isLoading }) {
  const [filterModule, setFilterModule] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const allStaffMembers = [...staff, ...carers];

  const getStaffName = (staffId) => {
    const staffMember = allStaffMembers.find(s => s.id === staffId);
    return staffMember?.full_name || "Unknown";
  };

  const getModuleName = (moduleId) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.title || "Unknown Module";
  };

  const checkStatus = (assignment) => {
    if (assignment.status === 'completed') return 'completed';
    if (assignment.due_date && isPast(parseISO(assignment.due_date))) return 'overdue';
    if (assignment.due_date && isBefore(parseISO(assignment.due_date), addDays(new Date(), 7))) return 'due_soon';
    return assignment.status;
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesModule = filterModule === "all" || assignment.training_module_id === filterModule;
    const status = checkStatus(assignment);
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    return matchesModule && matchesStatus;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    notStarted: assignments.filter(a => a.status === 'not_started').length,
    overdue: assignments.filter(a => checkStatus(a) === 'overdue').length,
  };

  const exportToCSV = () => {
    const headers = [
      "Staff Member",
      "Training Module",
      "Assigned Date",
      "Due Date",
      "Status",
      "Completed Date",
      "Score"
    ];

    const rows = filteredAssignments.map(assignment => [
      getStaffName(assignment.staff_id),
      getModuleName(assignment.training_module_id),
      format(parseISO(assignment.assigned_date), "yyyy-MM-dd"),
      assignment.due_date ? format(parseISO(assignment.due_date), "yyyy-MM-dd") : "N/A",
      checkStatus(assignment),
      assignment.completed_date ? format(parseISO(assignment.completed_date), "yyyy-MM-dd") : "N/A",
      assignment.score || "N/A"
    ]);

    const csvContent = [
      "Training Compliance Report",
      `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `training-compliance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    not_started: "bg-gray-100 text-gray-800",
    overdue: "bg-red-100 text-red-800",
    due_soon: "bg-orange-100 text-orange-800",
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Training Compliance Report
          </CardTitle>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-700">Completed</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-blue-700">In Progress</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.inProgress}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-600">Not Started</p>
              </div>
              <p className="text-2xl font-bold">{stats.notStarted}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-red-700">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Filter by Module</label>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(module => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Filter by Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="due_soon">Due Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setFilterModule("all");
                setFilterStatus("all");
              }}
              variant="outline"
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 font-medium text-gray-900">Staff Member</th>
                  <th className="text-left p-3 font-medium text-gray-900">Training Module</th>
                  <th className="text-left p-3 font-medium text-gray-900">Assigned</th>
                  <th className="text-left p-3 font-medium text-gray-900">Due Date</th>
                  <th className="text-left p-3 font-medium text-gray-900">Status</th>
                  <th className="text-left p-3 font-medium text-gray-900">Completed</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment, index) => {
                  const status = checkStatus(assignment);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{getStaffName(assignment.staff_id)}</td>
                      <td className="p-3">{getModuleName(assignment.training_module_id)}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {format(parseISO(assignment.assigned_date), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-sm">
                        {assignment.due_date ? format(parseISO(assignment.due_date), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-3">
                        <Badge className={statusColors[status]}>
                          {status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {assignment.completed_date 
                          ? format(parseISO(assignment.completed_date), "MMM d, yyyy")
                          : "-"
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAssignments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No training assignments match the selected filters</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}