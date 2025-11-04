import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle,
  Calendar,
  AlertCircle,
  Clock,
  UserCheck,
  Shield,
  Filter,
  Check,
  Trash2,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from "date-fns";

import NotificationCard from "../components/notifications/NotificationCard";

const notificationIcons = {
  shift_assigned: Calendar,
  shift_changed: Clock,
  shift_request: UserCheck,
  leave_request: Clock,
  clock_alert: AlertCircle,
  sos_alert: Shield,
  general: Bell,
};

const notificationColors = {
  shift_assigned: "from-blue-500 to-blue-600",
  shift_changed: "from-purple-500 to-purple-600",
  shift_request: "from-green-500 to-green-600",
  leave_request: "from-orange-500 to-orange-600",
  clock_alert: "from-yellow-500 to-yellow-600",
  sos_alert: "from-red-500 to-red-600",
  general: "from-gray-500 to-gray-600",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date');
      return allNotifications.filter(n => n.recipient_id === user.email || n.recipient_id === user.id);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          base44.entities.Notification.update(n.id, { is_read: true })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread" && notification.is_read) return false;
    if (filter === "read" && !notification.is_read) return false;
    if (typeFilter !== "all" && notification.type !== typeFilter) return false;
    return true;
  });

  const groupNotificationsByDate = (notifications) => {
    const groups = {
      today: [],
      yesterday: [],
      older: [],
    };

    notifications.forEach(notification => {
      try {
        const date = parseISO(notification.created_date);
        if (isToday(date)) {
          groups.today.push(notification);
        } else if (isYesterday(date)) {
          groups.yesterday.push(notification);
        } else {
          groups.older.push(notification);
        }
      } catch {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const notificationTypes = [
    { value: "all", label: "All Types", count: notifications.length },
    { value: "shift_assigned", label: "Shift Assigned", count: notifications.filter(n => n.type === "shift_assigned").length },
    { value: "shift_changed", label: "Shift Changed", count: notifications.filter(n => n.type === "shift_changed").length },
    { value: "shift_request", label: "Shift Request", count: notifications.filter(n => n.type === "shift_request").length },
    { value: "leave_request", label: "Leave Request", count: notifications.filter(n => n.type === "leave_request").length },
    { value: "clock_alert", label: "Clock Alert", count: notifications.filter(n => n.type === "clock_alert").length },
    { value: "sos_alert", label: "SOS Alert", count: notifications.filter(n => n.type === "sos_alert").length },
    { value: "general", label: "General", count: notifications.filter(n => n.type === "general").length },
  ].filter(type => type.count > 0);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold">{notifications.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Unread</p>
              <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Today</p>
              <p className="text-2xl font-bold text-blue-600">{groupedNotifications.today.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Urgent</p>
              <p className="text-2xl font-bold text-red-600">
                {notifications.filter(n => n.priority === 'urgent').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList>
                    <TabsTrigger value="all">
                      All ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread">
                      Unread ({unreadCount})
                    </TabsTrigger>
                    <TabsTrigger value="read">
                      Read ({notifications.length - unreadCount})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {notificationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {groupedNotifications.today.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Today</h2>
              <div className="space-y-2">
                {groupedNotifications.today.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    icon={notificationIcons[notification.type]}
                    color={notificationColors[notification.type]}
                    priorityColor={priorityColors[notification.priority]}
                    onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    onMarkAsUnread={() => markAsUnreadMutation.mutate(notification.id)}
                    onDelete={() => deleteMutation.mutate(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedNotifications.yesterday.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Yesterday</h2>
              <div className="space-y-2">
                {groupedNotifications.yesterday.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    icon={notificationIcons[notification.type]}
                    color={notificationColors[notification.type]}
                    priorityColor={priorityColors[notification.priority]}
                    onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    onMarkAsUnread={() => markAsUnreadMutation.mutate(notification.id)}
                    onDelete={() => deleteMutation.mutate(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedNotifications.older.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Older</h2>
              <div className="space-y-2">
                {groupedNotifications.older.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    icon={notificationIcons[notification.type]}
                    color={notificationColors[notification.type]}
                    priorityColor={priorityColors[notification.priority]}
                    onMarkAsRead={() => markAsReadMutation.mutate(notification.id)}
                    onMarkAsUnread={() => markAsUnreadMutation.mutate(notification.id)}
                    onDelete={() => deleteMutation.mutate(notification.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredNotifications.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {filter === "unread" 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}