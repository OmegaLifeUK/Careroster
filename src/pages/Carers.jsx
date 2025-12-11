import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, Mail, Award, MapPin } from "lucide-react";

import CarerDialog from "../components/carers/CarerDialog";
import CarerCard from "../components/carers/CarerCard";
import { ExportButton } from "@/components/ui/export-button";
import { useToast } from "@/components/ui/toast";

export default function Carers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCarer, setEditingCarer] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: carers = [], isLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => {
      const data = await base44.entities.Qualification.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const deleteCarerMutation = useMutation({
    mutationFn: (id) => base44.entities.Carer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carers'] });
      toast.success("Carer Deleted", "Carer deleted successfully");
    },
    onError: (error) => {
      toast.error("Error", "Failed to delete carer");
      console.error("Delete error:", error);
    },
  });

  const filteredCarers = Array.isArray(carers) ? carers.filter(carer => {
    if (!carer) return false;
    const matchesSearch = carer.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || carer.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const handleEdit = (carer) => {
    if (!carer) {
      console.error("No carer provided to handleEdit");
      return;
    }
    console.log("Editing carer:", carer);
    setEditingCarer(carer);
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (!id) {
      console.error("No carer ID provided to handleDelete");
      return;
    }
    if (confirm("Are you sure you want to delete this carer?")) {
      deleteCarerMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCarer(null);
  };

  const stats = {
    total: filteredCarers.length,
    active: filteredCarers.filter(c => c && c.status === 'active').length,
    onLeave: filteredCarers.filter(c => c && c.status === 'on_leave').length,
    inactive: filteredCarers.filter(c => c && c.status === 'inactive').length,
  };

  // Prepare data for export
  const exportData = filteredCarers.map(carer => ({
    full_name: carer?.full_name || '',
    email: carer?.email || '',
    phone: carer?.phone || '',
    status: carer?.status || '',
    employment_type: carer?.employment_type || '',
    hourly_rate: carer?.hourly_rate || '',
    qualifications: carer?.qualifications?.length || 0,
    city: carer?.address?.city || '',
    postcode: carer?.address?.postcode || '',
  }));

  const exportColumns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
    { key: 'employment_type', header: 'Employment Type' },
    { key: 'hourly_rate', header: 'Hourly Rate' },
    { key: 'qualifications', header: 'Qualifications' },
    { key: 'city', header: 'City' },
    { key: 'postcode', header: 'Postcode' },
  ];

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Carers</h1>
            <p className="text-gray-500">Manage your care team</p>
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={exportData} 
              filename="carers" 
              columns={exportColumns}
            />
            <Button
              onClick={() => {
                setEditingCarer(null);
                setShowDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Carer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Carers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("active")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("on_leave")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">On Leave</p>
              <p className="text-2xl font-bold text-orange-600">{stats.onLeave}</p>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setStatusFilter("inactive")}
          >
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
                  placeholder="Search carers..."
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
                  variant={statusFilter === "on_leave" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("on_leave")}
                >
                  On Leave
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
          {filteredCarers.map((carer) => {
            if (!carer) return null;
            
            return (
              <CarerCard
                key={carer.id}
                carer={carer}
                qualifications={qualifications}
                onDelete={() => handleDelete(carer.id)}
              />
            );
          })}
        </div>

        {filteredCarers.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 text-lg">No carers found</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchQuery ? "Try adjusting your search" : "Add your first carer to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        {showDialog && (
          <CarerDialog
            carer={editingCarer}
            qualifications={qualifications}
            onClose={handleCloseDialog}
          />
        )}
      </div>
    </div>
  );
}