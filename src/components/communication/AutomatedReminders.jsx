import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Send, Calendar, Clock, Mail, MessageSquare, Check } from "lucide-react";
import { format, parseISO, addHours, isFuture, isToday, isTomorrow, differenceInHours } from "date-fns";

export default function AutomatedReminders({ visits, clients, staff }) {
  const [reminderSettings, setReminderSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    hoursBeforeVisit: 24,
  });

  const queryClient = useQueryClient();

  const sendReminderMutation = useMutation({
    mutationFn: async ({ visitId, clientId, method }) => {
      const visit = visits.find(v => v.id === visitId);
      const client = clients.find(c => c.id === clientId);
      const assignedStaff = staff.find(s => s.id === visit?.assigned_staff_id);

      if (!visit || !client) throw new Error("Visit or client not found");

      const reminderMessage = `Reminder: You have a care visit scheduled for ${format(parseISO(visit.scheduled_start), "EEEE, MMMM d 'at' HH:mm")}. Your care worker ${assignedStaff?.full_name || "TBC"} will visit you at ${client.address?.street}, ${client.address?.city}.`;

      // Log the communication
      await base44.entities.ClientCommunication.create({
        client_id: clientId,
        communication_type: method === "email" ? "email" : "sms",
        direction: "outbound",
        subject: "Appointment Reminder",
        content: reminderMessage,
        related_visit_id: visitId,
        status: "sent",
        priority: "normal",
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-communications'] });
    },
  });

  const sendBulkRemindersMutation = useMutation({
    mutationFn: async ({ visitIds, method }) => {
      const promises = visitIds.map(visitId => {
        const visit = visits.find(v => v.id === visitId);
        if (!visit) return Promise.resolve();
        return sendReminderMutation.mutateAsync({ 
          visitId, 
          clientId: visit.client_id,
          method 
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-communications'] });
    },
  });

  const getUpcomingVisits = () => {
    return visits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        return isFuture(visitDate) && visit.status !== 'cancelled';
      } catch {
        return false;
      }
    }).sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  };

  const getVisitsNeedingReminder = () => {
    const upcomingVisits = getUpcomingVisits();
    return upcomingVisits.filter(visit => {
      try {
        const visitDate = parseISO(visit.scheduled_start);
        const hoursUntil = differenceInHours(visitDate, new Date());
        return hoursUntil > 0 && hoursUntil <= reminderSettings.hoursBeforeVisit;
      } catch {
        return false;
      }
    });
  };

  const upcomingVisits = getUpcomingVisits();
  const visitsNeedingReminder = getVisitsNeedingReminder();

  const handleSendReminder = (visitId, clientId, method) => {
    sendReminderMutation.mutate({ visitId, clientId, method });
  };

  const handleSendBulkReminders = (method) => {
    const visitIds = visitsNeedingReminder.map(v => v.id);
    sendBulkRemindersMutation.mutate({ visitIds, method });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Automated Visit Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-4">Reminder Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-enabled">SMS Reminders</Label>
                  <Switch
                    id="sms-enabled"
                    checked={reminderSettings.smsEnabled}
                    onCheckedChange={(checked) =>
                      setReminderSettings({ ...reminderSettings, smsEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Email Reminders</Label>
                  <Switch
                    id="email-enabled"
                    checked={reminderSettings.emailEnabled}
                    onCheckedChange={(checked) =>
                      setReminderSettings({ ...reminderSettings, emailEnabled: checked })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="hours-before">Send reminders (hours before visit)</Label>
                  <select
                    id="hours-before"
                    value={reminderSettings.hoursBeforeVisit}
                    onChange={(e) =>
                      setReminderSettings({ 
                        ...reminderSettings, 
                        hoursBeforeVisit: parseInt(e.target.value) 
                      })
                    }
                    className="w-full mt-2 px-3 py-2 border rounded-lg"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-4 text-blue-900">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => handleSendBulkReminders("sms")}
                  disabled={visitsNeedingReminder.length === 0 || !reminderSettings.smsEnabled || sendBulkRemindersMutation.isPending}
                  className="w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send {visitsNeedingReminder.length} SMS Reminders
                </Button>
                <Button
                  onClick={() => handleSendBulkReminders("email")}
                  disabled={visitsNeedingReminder.length === 0 || !reminderSettings.emailEnabled || sendBulkRemindersMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send {visitsNeedingReminder.length} Email Reminders
                </Button>
                <p className="text-xs text-blue-700 text-center">
                  {visitsNeedingReminder.length} visits within {reminderSettings.hoursBeforeVisit} hours
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Visits Needing Reminders</h3>
            {visitsNeedingReminder.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                <Check className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>All upcoming visits have been reminded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitsNeedingReminder.map(visit => {
                  const client = clients.find(c => c.id === visit.client_id);
                  const assignedStaff = staff.find(s => s.id === visit.assigned_staff_id);
                  const hoursUntil = differenceInHours(parseISO(visit.scheduled_start), new Date());

                  return (
                    <div key={visit.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                              {client?.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{client?.full_name}</p>
                              <p className="text-sm text-gray-500">
                                {format(parseISO(visit.scheduled_start), "EEE, MMM d 'at' HH:mm")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-13">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>In {hoursUntil}h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{assignedStaff?.full_name || "Unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {reminderSettings.smsEnabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(visit.id, visit.client_id, "sms")}
                              disabled={sendReminderMutation.isPending}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              SMS
                            </Button>
                          )}
                          {reminderSettings.emailEnabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(visit.id, visit.client_id, "email")}
                              disabled={sendReminderMutation.isPending}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Upcoming Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingVisits.slice(0, 10).map(visit => {
              const client = clients.find(c => c.id === visit.client_id);
              const assignedStaff = staff.find(s => s.id === visit.assigned_staff_id);
              
              return (
                <div key={visit.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                      {client?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client?.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {format(parseISO(visit.scheduled_start), "MMM d 'at' HH:mm")} • {assignedStaff?.full_name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {isToday(parseISO(visit.scheduled_start)) ? "Today" :
                     isTomorrow(parseISO(visit.scheduled_start)) ? "Tomorrow" :
                     format(parseISO(visit.scheduled_start), "EEE")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}