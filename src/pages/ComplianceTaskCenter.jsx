import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, AlertCircle, Filter, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ComplianceTaskCenter() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['compliance-tasks'],
    queryFn: async () => {
      const data = await base44.entities.ComplianceTask.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-tasks'] });
      setSelectedTask(null);
      toast.success("Success", "Task updated successfully");
    },
  });

  const currentStaff = staff.find(s => s.email === currentUser?.email);
  const isAdmin = currentUser?.role === 'admin';

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === "all" || task.status === filterStatus;
    const priorityMatch = filterPriority === "all" || task.priority === filterPriority;
    const assignmentMatch = isAdmin || task.assigned_to_staff_id === currentStaff?.id;
    return statusMatch && priorityMatch && assignmentMatch;
  });

  const stats = {
    total: filteredTasks.length,
    pending: filteredTasks.filter(t => t.status === 'pending').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    urgent: filteredTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-300 text-gray-700"
  };

  const sourceIcons = {
    audit_ai: <Sparkles className="w-4 h-4 text-purple-600" />,
    incident_ai: <Sparkles className="w-4 h-4 text-blue-600" />,
    training_ai: <Sparkles className="w-4 h-4 text-indigo-600" />,
    manual: null
  };

  const handleUpdateStatus = (task, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }
    updateTaskMutation.mutate({ id: task.id, data: updateData });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Task Center</h1>
          <p className="text-gray-500">Manage compliance tasks from audits, incidents, and training</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredTasks.map(task => {
            const assignedStaff = staff.find(s => s.id === task.assigned_to_staff_id);
            
            return (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {sourceIcons[task.source_type]}
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                        <Badge className={statusColors[task.status]}>{task.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span>Assigned to: {assignedStaff?.full_name || 'Unknown'}</span>
                        {task.due_date && <span>Due: {task.due_date}</span>}
                        {task.source_type.includes('_ai') && (
                          <Badge variant="outline" className="bg-purple-50">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(task, 'in_progress')}>
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button size="sm" className="bg-green-600" onClick={() => setSelectedTask(task)}>
                          Complete
                        </Button>
                      )}
                      {task.status === 'completed' && task.completion_notes && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedTask(task)}>
                          View Notes
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="border-b">
                <CardTitle>Complete Task</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">{selectedTask.title}</h3>
                    <p className="text-sm text-gray-600">{selectedTask.description}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Completion Notes</label>
                    <Textarea
                      value={selectedTask.completion_notes || ''}
                      onChange={(e) => setSelectedTask({ ...selectedTask, completion_notes: e.target.value })}
                      placeholder="Describe what actions were taken..."
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSelectedTask(null)}>Cancel</Button>
                    <Button onClick={() => {
                      updateTaskMutation.mutate({
                        id: selectedTask.id,
                        data: {
                          status: 'completed',
                          completed_date: new Date().toISOString().split('T')[0],
                          completion_notes: selectedTask.completion_notes
                        }
                      });
                    }}>
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}