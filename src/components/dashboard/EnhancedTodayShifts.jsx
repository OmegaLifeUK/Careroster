import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Clock, User, MapPin, Calendar, Edit, Trash2, CheckCircle, PlayCircle, MoreVertical, Phone, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  unfilled: "bg-orange-100 text-orange-800",
};

function ShiftCard({ shift, carer, client, onQuickEdit, onStatusChange }) {
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Popover open={showDetails} onOpenChange={setShowDetails}>
          <PopoverTrigger asChild>
            <div 
              className="p-4 border rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all bg-white cursor-pointer relative group"
              onMouseEnter={() => setShowDetails(true)}
              onMouseLeave={() => setTimeout(() => setShowDetails(false), 200)}
            >
              {/* Shift Time & Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">
                    {shift.start_time} - {shift.end_time}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {shift.duration_hours}h
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[shift.status]}>
                    {shift.status.replace('_', ' ')}
                  </Badge>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickEdit(shift);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Carer & Client Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600">Carer:</span>
                  <span className="font-medium">{carer?.full_name || "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{client?.full_name || "Unknown"}</span>
                </div>
              </div>

              {/* Quick Status Actions */}
              {shift.status !== 'completed' && (
                <div className="mt-3 pt-3 border-t flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {shift.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(shift.id, 'in_progress');
                      }}
                    >
                      <PlayCircle className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  )}
                  {shift.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(shift.id, 'completed');
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl("Schedule"));
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}

              {/* Tasks Preview */}
              {shift.tasks && shift.tasks.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Tasks:</p>
                  <div className="flex flex-wrap gap-1">
                    {shift.tasks.slice(0, 3).map((task, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                    {shift.tasks.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{shift.tasks.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </PopoverTrigger>

          {/* Hover Preview Popover */}
          <PopoverContent className="w-80" side="right" align="start">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">Shift Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{shift.duration_hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{shift.shift_type || 'Standard'}</span>
                  </div>
                </div>
              </div>

              {carer && (
                <div className="pt-3 border-t">
                  <h5 className="font-semibold text-sm mb-2">Carer Contact</h5>
                  <div className="space-y-2 text-sm">
                    {carer.phone && (
                      <a href={`tel:${carer.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                        <Phone className="w-3 h-3" />
                        {carer.phone}
                      </a>
                    )}
                    {carer.email && (
                      <a href={`mailto:${carer.email}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                        <Mail className="w-3 h-3" />
                        {carer.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {shift.notes && (
                <div className="pt-3 border-t">
                  <h5 className="font-semibold text-sm mb-1">Notes</h5>
                  <p className="text-xs text-gray-600">{shift.notes}</p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </ContextMenuTrigger>

      {/* Right-Click Context Menu */}
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onStatusChange(shift.id, 'in_progress')}>
          <PlayCircle className="w-4 h-4 mr-2" />
          Mark as In Progress
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onStatusChange(shift.id, 'completed')}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Mark as Completed
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => navigate(createPageUrl("Schedule"))}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Shift
        </ContextMenuItem>
        <ContextMenuItem onClick={() => carer && window.open(`tel:${carer.phone}`)}>
          <Phone className="w-4 h-4 mr-2" />
          Call Carer
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-red-600" onClick={() => onQuickEdit(shift)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Shift
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default function EnhancedTodayShifts({ shifts, carers, clients, isLoading }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Updated", "Shift status updated");
    },
  });

  const handleStatusChange = (shiftId, newStatus) => {
    updateShiftMutation.mutate({
      id: shiftId,
      data: { status: newStatus }
    });
  };

  const handleQuickEdit = (shift) => {
    // This would open a quick edit modal
    toast.info("Quick Edit", "Opening edit dialog...");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedShifts = [...shifts].sort((a, b) => {
    const timeA = a.start_time || "00:00";
    const timeB = b.start_time || "00:00";
    return timeA.localeCompare(timeB);
  });

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Today's Shifts</CardTitle>
          <Link 
            to={createPageUrl("Schedule")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Full Schedule →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {sortedShifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No shifts scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                carer={carers.find(c => c.id === shift.carer_id)}
                client={clients.find(c => c.id === shift.client_id)}
                onQuickEdit={handleQuickEdit}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center mt-4">
          💡 Tip: Hover for details • Right-click for quick actions
        </p>
      </CardContent>
    </Card>
  );
}