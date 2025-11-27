import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  Users, 
  Stethoscope,
  Activity,
  GraduationCap,
  ShoppingBag,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ENTRY_TYPE_CONFIG = {
  visitor: { label: "Visitor", icon: Users, color: "bg-blue-100 text-blue-700" },
  doctor_appointment: { label: "Doctor", icon: Stethoscope, color: "bg-red-100 text-red-700" },
  nurse_visit: { label: "Nurse", icon: Stethoscope, color: "bg-pink-100 text-pink-700" },
  therapist_visit: { label: "Therapist", icon: Users, color: "bg-teal-100 text-teal-700" },
  family_visit: { label: "Family", icon: Users, color: "bg-green-100 text-green-700" },
  outing_activity: { label: "Activity", icon: Activity, color: "bg-cyan-100 text-cyan-700" },
  outing_gp_clinic: { label: "GP/Clinic", icon: Stethoscope, color: "bg-rose-100 text-rose-700" },
  outing_hospital: { label: "Hospital", icon: Stethoscope, color: "bg-red-100 text-red-700" },
  outing_school: { label: "School", icon: GraduationCap, color: "bg-yellow-100 text-yellow-700" },
  outing_shopping: { label: "Shopping", icon: ShoppingBag, color: "bg-pink-100 text-pink-700" },
  outing_day_trip: { label: "Day Trip", icon: MapPin, color: "bg-emerald-100 text-emerald-700" },
  outing_community: { label: "Community", icon: Users, color: "bg-violet-100 text-violet-700" },
  outing_other: { label: "Outing", icon: Car, color: "bg-slate-100 text-slate-700" },
};

export default function ClientDailyLogWidget({ clientId, daysBack = 7, showTitle = true }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['client-daily-logs', clientId, daysBack],
    queryFn: async () => {
      const allLogs = await base44.entities.DailyLog.list('-log_date', 100);
      if (!Array.isArray(allLogs)) return [];
      
      const cutoffDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
      return allLogs
        .filter(log => log?.client_id === clientId && log.log_date >= cutoffDate)
        .sort((a, b) => {
          const dateCompare = (b.log_date || '').localeCompare(a.log_date || '');
          if (dateCompare !== 0) return dateCompare;
          return (b.arrival_time || '').localeCompare(a.arrival_time || '');
        });
    },
    enabled: !!clientId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          Loading activity...
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          {showTitle && <CardTitle className="text-lg">Activity & Outings</CardTitle>}
        </CardHeader>
        <CardContent className="p-4 text-center text-gray-500">
          <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No recorded activities in the last {daysBack} days</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedByDate = logs.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {showTitle && <CardTitle className="text-lg">Activity & Outings</CardTitle>}
          <Link to={createPageUrl("DailyLog")}>
            <Button variant="ghost" size="sm" className="text-blue-600">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([date, entries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {format(parseISO(date), 'EEEE, d MMM')}
                </span>
              </div>
              
              <div className="space-y-2 ml-6 border-l-2 border-gray-100 pl-4">
                {entries.map(entry => {
                  const config = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.visitor;
                  const Icon = config.icon;
                  const isOuting = entry.entry_type?.startsWith('outing_');

                  return (
                    <div 
                      key={entry.id} 
                      className={`p-3 rounded-lg border ${
                        isOuting ? 'bg-cyan-50 border-cyan-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                            {entry.arrival_time && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {entry.arrival_time}
                                {entry.departure_time && ` - ${entry.departure_time}`}
                              </span>
                            )}
                          </div>
                          
                          {isOuting && entry.outing_destination && (
                            <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-600" />
                              {entry.outing_destination}
                            </p>
                          )}
                          
                          {!isOuting && entry.visitor_name && (
                            <p className="text-sm text-gray-700 mt-1">
                              {entry.visitor_name}
                              {entry.visitor_organization && ` (${entry.visitor_organization})`}
                            </p>
                          )}
                          
                          {entry.purpose && (
                            <p className="text-sm text-gray-600 mt-1">{entry.purpose}</p>
                          )}
                          
                          {entry.outing_outcome && (
                            <p className="text-sm text-gray-600 mt-1 italic">"{entry.outing_outcome}"</p>
                          )}
                          
                          {entry.follow_up_required && (
                            <div className="flex items-center gap-1 mt-1 text-orange-600 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>Follow-up required</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}