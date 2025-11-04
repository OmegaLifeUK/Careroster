import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, UserCircle, Calendar, Clock, MapPin, FileText } from "lucide-react";
import { format, parseISO, isWithinInterval, isFuture } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
  missed: "bg-orange-100 text-orange-800",
};

export default function ClientVisitHistory({ visits, staff, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"));
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || "");

  const getClientVisits = () => {
    if (!selectedClient) return [];
    
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(visitDate, { start: from, end: to });
        const matchesClient = visit.client_id === selectedClient;
        
        return inRange && matchesClient;
      } catch {
        return false;
      }
    }).sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  };

  const clientVisits = getClientVisits();
  const selectedClientData = clients.find(c => c.id === selectedClient);

  const upcomingVisits = clientVisits.filter(v => {
    try {
      return isFuture(parseISO(v.scheduled_start));
    } catch {
      return false;
    }
  });

  const pastVisits = clientVisits.filter(v => {
    try {
      return !isFuture(parseISO(v.scheduled_start));
    } catch {
      return false;
    }
  });

  const completedVisits = clientVisits.filter(v => v.status === 'completed').length;
  const missedVisits = clientVisits.filter(v => v.status === 'missed').length;

  const exportToCSV = () => {
    const headers = [
      "Date", 
      "Time", 
      "Staff Member",
      "Duration",
      "Status",
      "Tasks",
      "Notes"
    ];
    const rows = clientVisits.map(visit => {
      const staffMember = staff.find(s => s.id === visit.assigned_staff_id);
      return [
        format(parseISO(visit.scheduled_start), "MMM d, yyyy"),
        `${format(parseISO(visit.scheduled_start), "HH:mm")} - ${format(parseISO(visit.scheduled_end), "HH:mm")}`,
        staffMember?.full_name || "Unassigned",
        `${Math.round((new Date(visit.scheduled_end) - new Date(visit.scheduled_start)) / 60000)} mins`,
        visit.status,
        visit.tasks?.join("; ") || "",
        visit.completion_notes || visit.visit_notes || ""
      ];
    });

    const csvContent = [
      `Client Visit History Report - ${selectedClientData?.full_name}`,
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `client-visit-history-${selectedClientData?.full_name}-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Client Visit History
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Complete visit records and care history</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!selectedClient}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="client-select">Select Client *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"));
                }}
                variant="outline"
                className="w-full"
              >
                Reset Dates
              </Button>
            </div>
          </div>

          {selectedClientData && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">{selectedClientData.full_name}</h3>
                    <div className="space-y-2 text-sm">
                      {selectedClientData.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">
                            {selectedClientData.address.street}, {selectedClientData.address.city}, {selectedClientData.address.postcode}
                          </span>
                        </div>
                      )}
                      {selectedClientData.care_needs && selectedClientData.care_needs.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Care Needs:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedClientData.care_needs.map((need, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {need}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                      <p className="text-2xl font-bold text-blue-600">{clientVisits.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{completedVisits}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Missed</p>
                      <p className="text-2xl font-bold text-red-600">{missedVisits}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Upcoming</p>
                      <p className="text-2xl font-bold text-purple-600">{upcomingVisits.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedClient && (
            <>
              {upcomingVisits.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Upcoming Visits ({upcomingVisits.length})
                  </h3>
                  <div className="space-y-2">
                    {upcomingVisits.map(visit => {
                      const staffMember = staff.find(s => s.id === visit.assigned_staff_id);
                      return (
                        <Card key={visit.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-semibold">
                                    {format(parseISO(visit.scheduled_start), "EEE, MMM d, yyyy")}
                                  </p>
                                  <Badge className={STATUS_COLORS[visit.status]}>
                                    {visit.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {format(parseISO(visit.scheduled_start), "HH:mm")} - {format(parseISO(visit.scheduled_end), "HH:mm")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <UserCircle className="w-4 h-4" />
                                    <span>{staffMember?.full_name || "Unassigned"}</span>
                                  </div>
                                </div>
                                {visit.visit_notes && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    <span className="font-medium">Notes:</span> {visit.visit_notes}
                                  </p>
                                )}
                                {visit.tasks && visit.tasks.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Tasks:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {visit.tasks.map((task, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {task}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastVisits.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Past Visits ({pastVisits.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left p-3 font-medium text-gray-900">Date</th>
                            <th className="text-left p-3 font-medium text-gray-900">Time</th>
                            <th className="text-left p-3 font-medium text-gray-900">Staff</th>
                            <th className="text-left p-3 font-medium text-gray-900">Status</th>
                            <th className="text-left p-3 font-medium text-gray-900">Tasks</th>
                            <th className="text-left p-3 font-medium text-gray-900">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastVisits.map(visit => {
                            const staffMember = staff.find(s => s.id === visit.assigned_staff_id);
                            return (
                              <tr key={visit.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{format(parseISO(visit.scheduled_start), "MMM d, yyyy")}</td>
                                <td className="p-3">
                                  {format(parseISO(visit.scheduled_start), "HH:mm")} - {format(parseISO(visit.scheduled_end), "HH:mm")}
                                </td>
                                <td className="p-3">{staffMember?.full_name || "Unassigned"}</td>
                                <td className="p-3">
                                  <Badge className={STATUS_COLORS[visit.status]}>
                                    {visit.status}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  {visit.tasks && visit.tasks.length > 0 ? (
                                    <span className="text-sm">{visit.tasks.length} task{visit.tasks.length !== 1 ? 's' : ''}</span>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="p-3 max-w-xs">
                                  <p className="text-sm text-gray-600 truncate">
                                    {visit.completion_notes || visit.visit_notes || "-"}
                                  </p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {clientVisits.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No visits found</h3>
                    <p className="text-gray-500">
                      No visit records for this client in the selected date range
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedClient && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a client</h3>
                <p className="text-gray-500">
                  Choose a client from the dropdown above to view their visit history
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}