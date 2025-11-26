import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, Edit, Trash2, Send, Home, Building, Paperclip } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-blue-100 text-blue-800",
  scheduled: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  unfilled: "bg-orange-100 text-orange-800",
};

export default function ShiftCard({ shift, carers = [], clients = [], properties = [], onEdit, onDelete, onSendRequest }) {
  if (!shift) return null;

  const getCarerName = (carerId) => {
    if (!carerId) return 'Unassigned';
    const carer = Array.isArray(carers) ? carers.find(c => c && c.id === carerId) : null;
    return carer?.full_name || 'Unassigned';
  };

  const getAssignmentDisplay = () => {
    if (shift.assignment_type === "client" && shift.client_id) {
      const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
      return {
        icon: User,
        label: client?.full_name || 'Unknown Client',
        sublabel: shift.location_address || client?.address?.street,
        color: 'text-blue-600'
      };
    } else if (shift.assignment_type === "property" && shift.property_id) {
      const property = Array.isArray(properties) ? properties.find(p => p && p.id === shift.property_id) : null;
      return {
        icon: Building,
        label: property?.property_name || shift.location_name || 'Unknown Property',
        sublabel: shift.location_address || property?.address?.street,
        color: 'text-purple-600'
      };
    } else if (shift.assignment_type === "location") {
      return {
        icon: Home,
        label: shift.location_name || 'Unknown Location',
        sublabel: shift.location_address,
        color: 'text-green-600'
      };
    }
    
    // Fallback for old shifts
    const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
    return {
      icon: User,
      label: client?.full_name || 'Unknown',
      sublabel: client?.address?.street,
      color: 'text-blue-600'
    };
  };

  const assignment = getAssignmentDisplay();
  const AssignmentIcon = assignment.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[shift.status] || 'bg-gray-100 text-gray-800'}>
                {shift.status}
              </Badge>
              {shift.shift_type && (
                <Badge variant="outline" className="capitalize">
                  {shift.shift_type.replace('_', ' ')}
                </Badge>
              )}
              {shift.care_type && (
                <Badge variant="outline" className="text-xs">
                  {shift.care_type.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{format(parseISO(shift.date), 'EEE, MMM d')}</span>
              <span>•</span>
              <span>{shift.start_time} - {shift.end_time}</span>
              {shift.duration_hours && (
                <span className="text-gray-500">({shift.duration_hours}h)</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Assignment Display */}
          <div className="flex items-start gap-2">
            <AssignmentIcon className={`w-4 h-4 mt-0.5 ${assignment.color}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{assignment.label}</p>
              {assignment.sublabel && (
                <p className="text-sm text-gray-500 truncate">{assignment.sublabel}</p>
              )}
            </div>
          </div>

          {/* Carer Assignment */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className={`text-sm ${shift.carer_id ? 'text-gray-900' : 'text-red-600 font-semibold'}`}>
              {getCarerName(shift.carer_id)}
            </span>
          </div>

          {/* Tasks */}
          {shift.tasks && Array.isArray(shift.tasks) && shift.tasks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {shift.tasks.slice(0, 3).map((task, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {task}
                </Badge>
              ))}
              {shift.tasks.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{shift.tasks.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Attached Documents */}
          {shift.attached_documents && shift.attached_documents.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {shift.attached_documents.length} document{shift.attached_documents.length > 1 ? 's' : ''} attached
              </span>
              {shift.attached_documents.some(d => d.requires_completion && !d.completed) && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">
                  {shift.attached_documents.filter(d => d.requires_completion && !d.completed).length} pending
                </Badge>
              )}
            </div>
          )}

          {/* Notes */}
          {shift.notes && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2 border-t pt-2">
              {shift.notes}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(shift)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(shift.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {!shift.carer_id && onSendRequest && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendRequest(shift)}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-1" />
                Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}