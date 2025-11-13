import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, Edit, Trash2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  unfilled: "bg-orange-100 text-orange-800",
  published: "bg-purple-100 text-purple-800",
  draft: "bg-gray-100 text-gray-800",
};

export default function ShiftCard({ shift, carers = [], clients = [], onEdit, onDelete }) {
  if (!shift) return null;
  
  const carer = Array.isArray(carers) ? carers.find(c => c && c.id === shift.carer_id) : null;
  const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {shift.date && format(parseISO(shift.date), "EEEE, MMM d, yyyy")}
              </p>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {shift.start_time} - {shift.end_time}
                </span>
                <span className="text-xs text-gray-400">
                  ({shift.duration_hours || 0}h)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusColors[shift.status] || statusColors.draft}>
              {(shift.status || 'draft').replace('_', ' ')}
            </Badge>
            {shift.shift_type && (
              <Badge variant="outline">{shift.shift_type}</Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Carer</p>
              <p className="font-medium">{carer?.full_name || "Unassigned"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-medium">{client?.full_name || "Unknown"}</p>
            </div>
          </div>
        </div>

        {shift.tasks && shift.tasks.length > 0 && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-xs text-gray-500 mb-2">Tasks:</p>
            <div className="flex flex-wrap gap-2">
              {shift.tasks.map((task, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {task}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {shift.notes && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-xs text-gray-500 mb-1">Notes:</p>
            <p className="text-sm text-gray-700">{shift.notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}