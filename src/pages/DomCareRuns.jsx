import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Navigation, Users, MapPin, Clock, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function DomCareRuns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => base44.entities.Run.list('-run_date'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list(),
  });

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.run_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-blue-100 text-blue-800",
    in_progress: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const stats = {
    total: runs.length,
    active: runs.filter(r => r.status === 'published' || r.status === 'in_progress').length,
    completed: runs.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Care Runs</h1>
            <p className="text-gray-500">Manage visit runs and routes</p>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Run
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Runs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search runs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "published" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("published")}
                >
                  Published
                </Button>
                <Button
                  variant={statusFilter === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("in_progress")}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Completed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filteredRuns.map((run) => {
            const runVisits = visits.filter(v => v.run_id === run.id);
            const assignedStaff = staff.find(s => s.id === run.assigned_staff_id);

            return (
              <Card key={run.id} className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Navigation className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{run.run_name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {run.run_date && format(parseISO(run.run_date), "EEEE, MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[run.status]}>
                      {run.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Staff</p>
                        <p className="font-medium text-sm">{assignedStaff?.full_name || "Unassigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="font-medium text-sm">{run.start_time} - {run.end_time}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-xs text-gray-500">Visits</p>
                        <p className="font-medium text-sm">{runVisits.length}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500">Miles</p>
                        <p className="font-medium text-sm">{run.total_estimated_mileage?.toFixed(1) || 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-medium text-sm">
                          {Math.floor((run.total_estimated_duration || 0) / 60)}h {(run.total_estimated_duration || 0) % 60}m
                        </p>
                      </div>
                    </div>
                  </div>

                  {run.is_recurring && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Recurring Run</span>
                      </div>
                      {run.recurrence_pattern && run.recurrence_pattern.length > 0 && (
                        <p className="text-xs text-blue-700 mt-1">
                          {run.recurrence_pattern.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {run.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Notes:</p>
                      <p className="text-sm text-gray-700">{run.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredRuns.length === 0 && !runsLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Navigation className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No runs found</h3>
              <p className="text-gray-500">Create a new run to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}