import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, BarChart3, TrendingUp, Download } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ExportButton } from "@/components/ui/export-button";

export default function TaskCompletionReport({ clientId, startDate, endDate }) {
  const [dateRange, setDateRange] = useState({
    start: startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: endDate || format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['task-completions-report', clientId, dateRange.start, dateRange.end],
    queryFn: async () => {
      const filter = { client_id: clientId };
      const data = await base44.entities.TaskCompletion.filter(filter);
      return Array.isArray(data) ? data.filter(c => {
        const date = c.scheduled_datetime?.split('T')[0];
        return date >= dateRange.start && date <= dateRange.end;
      }) : [];
    },
    enabled: !!clientId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['care-tasks', clientId],
    queryFn: async () => {
      const data = await base44.entities.CareTask.filter({ client_id: clientId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!clientId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const stats = {
    total: completions.length,
    completed: completions.filter(c => c.status === 'completed').length,
    refused: completions.filter(c => c.status === 'refused').length,
    missed: completions.filter(c => c.status === 'missed').length,
    partiallyCompleted: completions.filter(c => c.status === 'partially_completed').length,
  };

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;

  const taskBreakdown = tasks.map(task => {
    const taskCompletions = completions.filter(c => c.care_task_id === task.id);
    const taskCompleted = taskCompletions.filter(c => c.status === 'completed').length;
    const taskRate = taskCompletions.length > 0 ? ((taskCompleted / taskCompletions.length) * 100).toFixed(1) : 0;

    return {
      task_name: task.task_name,
      category: task.category,
      priority: task.priority,
      total_instances: taskCompletions.length,
      completed: taskCompleted,
      refused: taskCompletions.filter(c => c.status === 'refused').length,
      missed: taskCompletions.filter(c => c.status === 'missed').length,
      completion_rate: taskRate,
    };
  }).filter(t => t.total_instances > 0);

  const exportData = completions.map(completion => {
    const task = tasks.find(t => t.id === completion.care_task_id);
    const client = clients.find(c => c.id === completion.client_id);
    
    return {
      date: completion.scheduled_datetime?.split('T')[0] || '',
      client_name: client?.full_name || '',
      task_name: task?.task_name || '',
      category: task?.category || '',
      priority: task?.priority || '',
      status: completion.status || '',
      completion_notes: completion.completion_notes || '',
      refusal_reason: completion.refusal_reason || '',
      missed_reason: completion.missed_reason || '',
      duration_minutes: completion.duration_minutes || '',
      client_response: completion.client_response || '',
    };
  });

  const exportColumns = [
    { key: 'date', header: 'Date' },
    { key: 'client_name', header: 'Client' },
    { key: 'task_name', header: 'Task' },
    { key: 'category', header: 'Category' },
    { key: 'priority', header: 'Priority' },
    { key: 'status', header: 'Status' },
    { key: 'completion_notes', header: 'Notes' },
    { key: 'refusal_reason', header: 'Refusal Reason' },
    { key: 'missed_reason', header: 'Missed Reason' },
    { key: 'duration_minutes', header: 'Duration (min)' },
    { key: 'client_response', header: 'Client Response' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Task Completion Report
            </CardTitle>
            <ExportButton 
              data={exportData}
              filename={`task-completion-report-${dateRange.start}-to-${dateRange.end}`}
              columns={exportColumns}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-700 mb-1">Total Tasks</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
              <p className="text-sm text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <XCircle className="w-6 h-6 mx-auto text-red-600 mb-1" />
              <p className="text-sm text-red-700 mb-1">Refused</p>
              <p className="text-2xl font-bold text-red-900">{stats.refused}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <AlertCircle className="w-6 h-6 mx-auto text-orange-600 mb-1" />
              <p className="text-sm text-orange-700 mb-1">Missed</p>
              <p className="text-2xl font-bold text-orange-900">{stats.missed}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-purple-600 mb-1" />
              <p className="text-sm text-purple-700 mb-1">Rate</p>
              <p className="text-2xl font-bold text-purple-900">{completionRate}%</p>
            </div>
          </div>

          {taskBreakdown.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Task Breakdown</h3>
              <div className="space-y-2">
                {taskBreakdown.map((task, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{task.task_name}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.category.replace('_', ' ')}
                          </Badge>
                          <Badge className="text-xs bg-blue-100 text-blue-800">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-900">{task.completion_rate}%</p>
                        <p className="text-xs text-gray-500">{task.completed}/{task.total_instances}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                        style={{ width: `${task.completion_rate}%` }}
                      />
                    </div>
                    {(task.refused > 0 || task.missed > 0) && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-600">
                        {task.refused > 0 && <span className="text-red-600">Refused: {task.refused}</span>}
                        {task.missed > 0 && <span className="text-orange-600">Missed: {task.missed}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completions.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              <p>No task completions recorded for this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}