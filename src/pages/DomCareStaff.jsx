import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, Mail, Car, MapPin, Trash2 } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { useToast } from "@/components/ui/toast";
import StaffDialog from "../components/domcare/StaffDialog";

export default function DomCareStaff() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ['domcare-qualifications'],
    queryFn: () => base44.entities.DomCareQualification.list(),
  });

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || member.is_active === (statusFilter === "active");
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.is_active).length,
    inactive: staff.filter(s => !s.is_active).length,
  };

  // Prepare data for export
  const exportData = filteredStaff.map(staff => ({
    full_name: staff.full_name,
    email: staff.email,
    phone: staff.phone,
    is_active: staff.is_active ? 'Yes' : 'No',
    vehicle_type: staff.vehicle_type,
    max_visits_per_day: staff.max_visits_per_day,
    hourly_rate: staff.hourly_rate,
    qualifications: staff.qualifications?.length || 0,
    preferred_areas: staff.preferred_areas?.join('; ') || '',
  }));

  const exportColumns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'is_active', header: 'Active' },
    { key: 'vehicle_type', header: 'Vehicle' },
    { key: 'max_visits_per_day', header: 'Max Visits/Day' },
    { key: 'hourly_rate', header: 'Hourly Rate' },
    { key: 'qualifications', header: 'Qualifications' },
    { key: 'preferred_areas', header: 'Preferred Areas' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Domiciliary Care Staff</h1>
            <p className="text-gray-500">Manage your care team</p>
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={exportData} 
              filename="domcare-staff" 
              columns={exportColumns}
            />
            <Button
              onClick={() => {
                setEditingStaff(null);
                setShowStaffDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Staff</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                      {member.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{member.full_name}</h3>
                      <Badge className={member.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.vehicle_type && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Car className="w-4 h-4" />
                      <span className="capitalize">{member.vehicle_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  {member.preferred_areas && member.preferred_areas.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{member.preferred_areas.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>

                {member.max_visits_per_day && (
                  <div className="mb-4 p-2 bg-blue-50 rounded">
                    <p className="text-xs text-blue-700">Max visits/day:</p>
                    <p className="text-sm font-medium text-blue-900">{member.max_visits_per_day}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingStaff(member);
                      setShowStaffDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStaff.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <p>No staff members found</p>
          </div>
        )}

        {showStaffDialog && (
          <StaffDialog
            staff={editingStaff}
            onClose={() => {
              setShowStaffDialog(false);
              setEditingStaff(null);
            }}
          />
        )}
      </div>
    </div>
  );
}