import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isPast
} from "date-fns";
import { useToast } from "@/components/ui/toast";

const taskTypes = {
  assessment: { label: 'Assessment', icon: AlertCircle, color: 'bg-purple-100 text-purple-700' },
  review: { label: 'Review', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  supervision: { label: 'Supervision', icon: Users, color: 'bg-green-100 text-green-700' },
  audit: { label: 'Audit', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' },
  document_completion: { label: 'Document', icon: AlertCircle, color: 'bg-indigo-100 text-indigo-700' },
  other: { label: 'Other', icon: AlertCircle, color: 'bg-gray-100 text-gray-700' }
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-400'
};

export default function StaffTaskCalendar({ tasks, onTaskClick, onTaskUpdate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    });
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const newDueDate = format(date, 'yyyy-MM-dd');
    
    try {
      await base44.entities.StaffTask.update(taskId, { due_date: newDueDate });
      toast.success("Task updated", `Due date changed to ${format(date, 'MMM d, yyyy')}`);
      onTaskUpdate(taskId, { due_date: newDueDate });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task", error.message);
    }
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isOverdue = isPast(day) && !isDayToday;

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`
                      min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                      ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${isDayToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                      ${isSelected ? 'ring-2 ring-blue-400' : ''}
                      hover:shadow-md
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isDayToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    `}>
                      {format(day, dateFormat)}
                    </div>

                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => {
                        const typeConfig = taskTypes[task.task_type] || taskTypes.other;
                        const Icon = typeConfig.icon;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick(task);
                            }}
                            className={`
                              text-xs p-1 rounded border-l-2 ${priorityColors[task.priority]}
                              ${task.status === 'completed' ? 'bg-green-50' : 
                                task.status === 'in_progress' ? 'bg-blue-50' : 
                                'bg-gray-50'}
                              hover:shadow cursor-move truncate
                            `}
                          >
                            <div className="flex items-center gap-1">
                              <Icon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{task.title}</span>
                            </div>
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Tasks */}
      <div>
        <Card className="sticky top-4">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </h3>

            {selectedDate && selectedDateTasks.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No tasks scheduled for this date
              </p>
            )}

            <div className="space-y-3">
              {selectedDateTasks.map(task => {
                const typeConfig = taskTypes[task.task_type] || taskTypes.other;
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="p-3 border rounded-lg hover:shadow cursor-pointer transition-shadow"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`p-1.5 rounded ${typeConfig.color} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-300' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {task.priority}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {task.assigned_to_staff_name && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                        <Users className="w-3 h-3" />
                        {task.assigned_to_staff_name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}