import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, AlertCircle, Play, ArrowRight } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
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
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  urgent: 'bg-red-100 text-red-700 border-red-300'
};

const columns = [
  { id: 'pending', title: 'Pending', color: 'bg-gray-50' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50' }
];

export default function StaffTaskKanban({ tasks, onTaskClick, onTaskUpdate }) {
  const { toast } = useToast();

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    try {
      await base44.entities.StaffTask.update(taskId, { status: newStatus });
      toast.success("Task updated", `Status changed to ${newStatus.replace('_', ' ')}`);
      onTaskUpdate(taskId, { status: newStatus });
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task", error.message);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.id} className={`rounded-lg ${column.color} p-4`}>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              {column.title}
              <Badge variant="secondary">{tasksByStatus[column.id].length}</Badge>
            </h3>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-3 min-h-[500px] ${
                    snapshot.isDraggingOver ? 'bg-blue-100/50 rounded-lg' : ''
                  }`}
                >
                  {tasksByStatus[column.id].map((task, index) => {
                    const typeConfig = taskTypes[task.task_type] || taskTypes.other;
                    const Icon = typeConfig.icon;
                    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
                    const isDueToday = task.due_date && isToday(parseISO(task.due_date));

                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`cursor-move hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-2 mb-2">
                                <div className={`p-2 rounded-lg ${typeConfig.color} flex-shrink-0`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2 mt-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                  </Badge>
                                  {task.due_date && (
                                    <Badge 
                                      variant="outline"
                                      className={`text-xs ${
                                        isOverdue ? 'bg-red-50 text-red-700 border-red-200' :
                                        isDueToday ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      {format(parseISO(task.due_date), 'MMM d')}
                                    </Badge>
                                  )}
                                </div>

                                {task.assigned_to_staff_name && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Users className="w-3 h-3" />
                                    {task.assigned_to_staff_name}
                                  </div>
                                )}

                                {task.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTaskClick(task);
                                    }}
                                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-xs"
                                  >
                                    {task.status === 'in_progress' ? (
                                      <>
                                        <ArrowRight className="w-3 h-3 mr-1" />
                                        Continue
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3 h-3 mr-1" />
                                        Start
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}