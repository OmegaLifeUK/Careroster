import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Phone, Mail, MapPin, Award, Edit, Trash2, ClipboardList, CheckCircle, AlertTriangle, Clock, Eye, UserPlus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { differenceInDays } from "date-fns";

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  on_leave: "bg-orange-100 text-orange-800",
};

export default function CarerCard({ carer, qualifications = [], onEdit, onDelete }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  if (!carer) return null;

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking a button
    if (e.target.closest('button')) return;
    navigate(createPageUrl('CarerDetail') + `?id=${carer.id}`);
  };

  const carerQualifications = Array.isArray(qualifications) ? qualifications.filter(q => 
    q && carer.qualifications?.includes(q.id)
  ) : [];

  // Fetch latest supervision for this carer
  const { data: supervisions = [] } = useQuery({
    queryKey: ['carer-supervision-status', carer.id],
    queryFn: async () => {
      const data = await base44.entities.StaffSupervision.filter(
        { staff_id: carer.id },
        '-supervision_date',
        1
      );
      return Array.isArray(data) ? data : [];
    },
  });

  const latestSupervision = supervisions[0];
  const getSupervisionStatus = () => {
    if (!latestSupervision) return { status: "none", color: "bg-gray-100 text-gray-600", icon: ClipboardList, label: "No supervision" };
    if (!latestSupervision.next_supervision_due) return { status: "completed", color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Up to date" };
    
    const daysUntilDue = differenceInDays(new Date(latestSupervision.next_supervision_due), new Date());
    
    if (daysUntilDue < 0) return { status: "overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Overdue" };
    if (daysUntilDue <= 7) return { status: "due_soon", color: "bg-orange-100 text-orange-700", icon: Clock, label: "Due soon" };
    return { status: "on_track", color: "bg-green-100 text-green-700", icon: CheckCircle, label: "On track" };
  };

  const supervisionStatus = getSupervisionStatus();

  // Check if user account exists for this carer
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        return [];
      }
    },
  });

  const hasUserAccount = carer.email && allUsers.some(u => u.email === carer.email);

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      return await base44.users.inviteUser(carer.email, "user");
    },
    onSuccess: () => {
      toast.success("Invitation sent", `${carer.full_name} will receive an email to register`);
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
    onError: (error) => {
      toast.error("Failed to send invitation", error.message);
    },
  });

  const handleInviteUser = (e) => {
    e.stopPropagation();
    if (!carer.email) {
      toast.error("No email address", "Please add an email to this carer before inviting");
      return;
    }
    inviteUserMutation.mutate();
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer card-interactive"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
              {carer.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{carer.full_name}</h3>
              <p className="text-sm text-gray-500">
                {carer.employment_type ? carer.employment_type.replace(/_/g, ' ') : 'Not specified'}
              </p>
            </div>
          </div>
          <Badge className={statusColors[carer.status] || statusColors.inactive}>
            {carer.status ? carer.status.replace(/_/g, ' ') : 'Unknown'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {carer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{carer.phone}</span>
            </div>
          )}
          {carer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="truncate">{carer.email}</span>
            </div>
          )}
          {carer.address?.city && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{carer.address.city}</span>
            </div>
          )}
        </div>

        {carerQualifications.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <Award className="w-4 h-4" />
              <span className="font-medium">Qualifications:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {carerQualifications.map(qual => (
                <Badge key={qual.id} variant="outline" className="text-xs">
                  {qual.qualification_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {carer.hourly_rate && (
          <div className="mb-4 p-2 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Hourly Rate</p>
            <p className="text-lg font-semibold text-green-700">£{carer.hourly_rate?.toFixed(2)}</p>
          </div>
        )}

        {/* Supervision Status */}
        <div className="mb-4 flex items-center gap-2">
          <Badge className={supervisionStatus.color}>
            <supervisionStatus.icon className="w-3 h-3 mr-1" />
            Supervision: {supervisionStatus.label}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl('CarerDetail') + `?id=${carer.id}`);
            }}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(carer);
            }}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {!hasUserAccount && carer.email && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleInviteUser}
              disabled={inviteUserMutation.isPending}
              className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Invite as user to access Staff Portal"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          )}
          {hasUserAccount && (
            <Badge variant="outline" className="text-green-600 border-green-600 px-3">
              <CheckCircle className="w-3 h-3 mr-1" />
              User
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(carer.id);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}