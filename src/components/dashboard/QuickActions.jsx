import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Calendar, 
  UserPlus, 
  Users, 
  ClipboardList,
  AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function QuickActions({ pendingLeave, unfilledShifts }) {
  const actions = [
    {
      title: "Create Shift",
      icon: Calendar,
      link: createPageUrl("Schedule"),
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Add Carer",
      icon: UserPlus,
      link: createPageUrl("Carers"),
      color: "from-green-500 to-green-600",
    },
    {
      title: "Add Client",
      icon: Users,
      link: createPageUrl("Clients"),
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Leave Requests",
      icon: ClipboardList,
      link: createPageUrl("LeaveRequests"),
      color: "from-orange-500 to-orange-600",
      badge: pendingLeave,
    },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {unfilledShifts > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900 text-sm">Attention Required</p>
              <p className="text-xs text-orange-700">
                {unfilledShifts} unfilled shift{unfilledShifts !== 1 ? 's' : ''} need assignment
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} to={action.link}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:shadow-md transition-all relative"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.title}</span>
                {action.badge > 0 && (
                  <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                    {action.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}