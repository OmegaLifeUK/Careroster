import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Mail, MailOpen, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function NotificationCard({
  notification,
  icon: Icon,
  color,
  priorityColor,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}) {
  const getRelatedLink = () => {
    if (!notification.related_entity_type || !notification.related_entity_id) return null;

    const linkMap = {
      shift: createPageUrl("Schedule"),
      leave_request: createPageUrl("LeaveRequests"),
      carer: createPageUrl("Carers"),
      client: createPageUrl("Clients"),
    };

    return linkMap[notification.related_entity_type];
  };

  const relatedLink = getRelatedLink();

  return (
    <Card 
      className={`transition-all hover:shadow-md ${
        notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${color} flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold ${notification.is_read ? 'text-gray-900' : 'text-gray-900'}`}>
                    {notification.title}
                  </h3>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={priorityColor}>
                    {notification.priority}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(parseISO(notification.created_date), { addSuffix: true })}
                  </span>
                  {relatedLink && (
                    <Link to={relatedLink}>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.is_read ? (
                    <DropdownMenuItem onClick={onMarkAsRead}>
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onMarkAsUnread}>
                      <Mail className="w-4 h-4 mr-2" />
                      Mark as Unread
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}