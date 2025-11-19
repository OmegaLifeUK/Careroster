import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, MessageSquare, ThumbsUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ComplaintsManagement() {
  const [view, setView] = useState("complaints"); // "complaints" or "compliments"
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    complaint_type: "care_quality",
    severity: "medium",
    description: "",
    complainant_name: "",
    complainant_relationship: "",
    desired_outcome: ""
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const data = await base44.entities.Complaint.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: compliments = [] } = useQuery({
    queryKey: ['compliments'],
    queryFn: async () => {
      const data = await base44.entities.Compliment.list('-created_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const createComplaintMutation = useMutation({
    mutationFn: (data) => base44.entities.Complaint.create({
      ...data,
      status: 'received',
      received_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setShowDialog(false);
      resetForm();
      toast.success("Success", "Complaint recorded successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      complaint_type: "care_quality",
      severity: "medium",
      description: "",
      complainant_name: "",
      complainant_relationship: "",
      desired_outcome: ""
    });
  };

  const statusColors = {
    received: "bg-yellow-100 text-yellow-800",
    investigating: "bg-blue-100 text-blue-800",
    responded: "bg-purple-100 text-purple-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-300 text-gray-600"
  };

  const severityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  if (selectedItem) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedItem(null)} className="mb-4">
            ← Back
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>
                    {selectedItem.complaint_type ? selectedItem.complaint_type.replace(/_/g, ' ') : 'Compliment'}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedItem.complainant_name || selectedItem.source} - {selectedItem.received_date || selectedItem.created_date}
                  </p>
                </div>
                {selectedItem.status && (
                  <Badge className={statusColors[selectedItem.status]}>
                    {selectedItem.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">
                    {selectedItem.complaint_type ? 'Complaint Details' : 'Compliment'}
                  </Label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded">{selectedItem.description || selectedItem.comment}</p>
                </div>

                {selectedItem.investigation_notes && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Investigation Notes</Label>
                    <p className="text-gray-900 bg-blue-50 p-4 rounded">{selectedItem.investigation_notes}</p>
                  </div>
                )}

                {selectedItem.resolution && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Resolution</Label>
                    <p className="text-gray-900 bg-green-50 p-4 rounded border-l-4 border-green-500">
                      {selectedItem.resolution}
                    </p>
                  </div>
                )}

                {selectedItem.staff_member && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Staff Member Mentioned</Label>
                    <p className="font-medium">{selectedItem.staff_member}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complaints & Comments</h1>
            <p className="text-gray-500">Manage feedback and complaints</p>
          </div>
          {view === "complaints" && (
            <Button onClick={() => setShowDialog(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Complaint
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            variant={view === "complaints" ? "default" : "outline"}
            onClick={() => setView("complaints")}
          >
            <FileText className="w-4 h-4 mr-2" />
            Complaints ({complaints.length})
          </Button>
          <Button
            variant={view === "compliments" ? "default" : "outline"}
            onClick={() => setView("compliments")}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Compliments ({compliments.length})
          </Button>
        </div>

        <div className="space-y-4">
          {view === "complaints" ? (
            complaints.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No complaints recorded</p>
                </CardContent>
              </Card>
            ) : (
              complaints.map(complaint => (
                <Card 
                  key={complaint.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedItem(complaint)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageSquare className="w-5 h-5 text-orange-600" />
                          <h3 className="font-semibold text-lg">
                            {complaint.complaint_type?.replace(/_/g, ' ')}
                          </h3>
                          <Badge className={severityColors[complaint.severity]}>
                            {complaint.severity}
                          </Badge>
                          <Badge className={statusColors[complaint.status]}>
                            {complaint.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{complaint.description}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>From: {complaint.complainant_name}</span>
                          <span>Received: {complaint.received_date}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            compliments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ThumbsUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No compliments recorded</p>
                </CardContent>
              </Card>
            ) : (
              compliments.map(compliment => (
                <Card 
                  key={compliment.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow bg-green-50/50"
                  onClick={() => setSelectedItem(compliment)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <ThumbsUp className="w-5 h-5 text-green-600 mt-1" />
                      <div className="flex-1">
                        <p className="text-gray-900 mb-3">{compliment.comment}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Source: {compliment.source}</span>
                          {compliment.staff_member && <span>Staff: {compliment.staff_member}</span>}
                          <span>{compliment.created_date}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          )}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle>Record Complaint</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Complaint Type</Label>
                      <Select value={formData.complaint_type} onValueChange={(val) => setFormData({ ...formData, complaint_type: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["care_quality", "staff_behaviour", "communication", "facilities", "medication", "safeguarding", "financial", "other"].map(type => (
                            <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Severity</Label>
                      <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["low", "medium", "high", "critical"].map(sev => (
                            <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Complainant Name</Label>
                    <Input
                      value={formData.complainant_name}
                      onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
                      placeholder="Name of person making complaint"
                    />
                  </div>

                  <div>
                    <Label>Relationship to Service User</Label>
                    <Input
                      value={formData.complainant_relationship}
                      onChange={(e) => setFormData({ ...formData, complainant_relationship: e.target.value })}
                      placeholder="e.g., Family member, Service user, etc."
                    />
                  </div>

                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the complaint"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Desired Outcome</Label>
                    <Textarea
                      value={formData.desired_outcome}
                      onChange={(e) => setFormData({ ...formData, desired_outcome: e.target.value })}
                      placeholder="What outcome does the complainant want?"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!formData.description) {
                          toast.error("Error", "Please provide a description");
                          return;
                        }
                        createComplaintMutation.mutate(formData);
                      }}
                      disabled={createComplaintMutation.isPending}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {createComplaintMutation.isPending ? "Recording..." : "Record Complaint"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}