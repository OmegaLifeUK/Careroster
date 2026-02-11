import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, AlertCircle, Calendar, Edit, Trash2, Award } from "lucide-react";

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const frequencyLabels = {
  every_visit: "Every Visit/Shift",
  daily: "Daily",
  twice_daily: "Twice Daily",
  three_times_daily: "3x Daily",
  weekly: "Weekly",
  as_needed: "As Needed",
  specific_times: "Specific Times",
};

const recurrenceLabels = {
  one_off: "One-Off",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const timeOfDayLabels = {
  anytime: "Anytime",
  morning: "Morning",
  lunchtime: "Lunchtime",
  afternoon: "Afternoon",
  evening: "Evening",
  dinner_time: "Dinner Time",
};

export default function TaskCard({ task, qualifications = [], onEdit, onDelete }) {
  if (!task) return null;

  const taskQualifications = Array.isArray(qualifications) ? qualifications.filter(q =>
    q && task.required_qualifications?.includes(q.id)
  ) : [];

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking a button
    if (e.target.closest('button')) return;
    onEdit(task);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer card-interactive border-l-4" 
      style={{ borderLeftColor: task.priority === 'critical' ? '#EF4444' : task.priority === 'high' ? '#F97316' : '#3B82F6' }}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{task.task_name}</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {frequencyLabels[task.frequency]}
              </Badge>
            </div>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="space-y-2 text-xs text-gray-600">
          {task.estimated_duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{task.estimated_duration_minutes} minutes</span>
            </div>
          )}

          {task.scheduled_date && (
            <div className="flex items-center gap-2 text-blue-700">
              <Calendar className="w-3 h-3" />
              <span className="font-medium">
                {task.scheduled_date}
                {task.scheduled_time && ` at ${task.scheduled_time}`}
              </span>
            </div>
          )}

          {task.time_of_day && task.time_of_day !== "anytime" && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{timeOfDayLabels[task.time_of_day]}</span>
            </div>
          )}

          {task.recurrence_type && task.recurrence_type !== "one_off" && (
            <div className="flex items-center gap-2 text-indigo-700">
              <Calendar className="w-3 h-3" />
              <span className="font-medium">{recurrenceLabels[task.recurrence_type]}</span>
              {task.recurrence_days && task.recurrence_days.length > 0 && (
                <span className="text-xs">({task.recurrence_days.map(d => d.substring(0, 3)).join(", ")})</span>
              )}
            </div>
          )}

          {task.requires_two_staff && (
            <div className="flex items-center gap-2 text-purple-700">
              <Users className="w-3 h-3" />
              <span className="font-medium">Two staff required</span>
            </div>
          )}

          {(task.alerts_if_missed || task.alerts_if_refused) && (
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-3 h-3" />
              <span>
                Alerts: {task.alerts_if_missed && "Missed"} {task.alerts_if_missed && task.alerts_if_refused && "/"} {task.alerts_if_refused && "Refused"}
              </span>
            </div>
          )}

          {taskQualifications.length > 0 && (
            <div className="flex items-start gap-2">
              <Award className="w-3 h-3 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {taskQualifications.map(qual => (
                  <Badge key={qual.id} variant="outline" className="text-xs">
                    {qual.qualification_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}