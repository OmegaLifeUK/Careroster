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
import { Bell, Plus, Send, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function RegulatoryNotifications() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [formData, setFormData] = useState({
    regulator: "CQC",
    notification_type: "serious_incident",
    incident_date: "",
    summary: "",
    detailed_description: "",
    immediate_actions_taken: "",
    police_informed: false,
    family_informed: false,
    language: "english"
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery({
    queryKey: ['regulatory-notifications'],
    queryFn: async () => {
      const data = await base44.entities.RegulatoryNotification.list('-notification_date');
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RegulatoryNotification.create({
      ...data,
      notification_date: new Date().toISOString(),
      status: 'submitted'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulatory-notifications'] });
      setShowDialog(false);
      resetForm();
      toast.success("Success", "Notification submitted successfully");
    },
  });

  const resetForm = () => {
    setFormData({
      regulator: "CQC",
      notification_type: "serious_incident",
      incident_date: "",
      summary: "",
      detailed_description: "",
      immediate_actions_taken: "",
      police_informed: false,
      family_informed: false,
      language: "english"
    });
  };

  const handleSubmit = () => {
    if (!formData.incident_date || !formData.summary) {
      toast.error("Error", "Please fill in all required fields");
      return;
    }
    createMutation.mutate(formData);
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    acknowledged: "bg-green-100 text-green-800",
    under_review: "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-300 text-gray-600"
  };

  const regulatorColors = {
    CQC: "bg-blue-500",
    Ofsted: "bg-green-500",
    CIW: "bg-red-500"
  };

  if (selectedNotification) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedNotification(null)} className="mb-4">
            ← Back to Notifications
          </Button>
          
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={regulatorColors[selectedNotification.regulator]}>
                      {selectedNotification.regulator}
                    </Badge>
                    {selectedNotification.notification_type.replace(/_/g, ' ')}
                  </CardTitle>
                  {selectedNotification.reference_number && (
                    <p className="text-sm text-gray-500 mt-1">
                      Ref: {selectedNotification.reference_number}
                    </p>
                  )}
                </div>
                <Badge className={statusColors[selectedNotification.status]}>
                  {selectedNotification.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Incident Date</Label>
                    <p className="font-medium">{selectedNotification.incident_date}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Notification Date</Label>
                    <p className="font-medium">{selectedNotification.notification_date}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Summary</Label>
                  <p className="text-gray-900">{selectedNotification.summary}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Detailed Description</Label>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded">{selectedNotification.detailed_description}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Immediate Actions Taken</Label>
                  <p className="text-gray-900 bg-blue-50 p-4 rounded">{selectedNotification.immediate_actions_taken}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Police Informed</p>
                    <p className="font-medium">{selectedNotification.police_informed ? 'Yes' : 'No'}</p>
                    {selectedNotification.police_reference && (
                      <p className="text-xs text-gray-600 mt-1">Ref: {selectedNotification.police_reference}</p>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Family Informed</p>
                    <p className="font-medium">{selectedNotification.family_informed ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {selectedNotification.regulator_response && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Regulator Response</Label>
                    <p className="text-gray-900 bg-green-50 p-4 rounded border-l-4 border-green-500">
                      {selectedNotification.regulator_response}
                    </p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Regulatory Notifications</h1>
            <p className="text-gray-500">CQC, Ofsted & CIW notifications</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Notification
          </Button>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map(notification => (
              <Card 
                key={notification.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedNotification(notification)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={regulatorColors[notification.regulator]}>
                          {notification.regulator}
                        </Badge>
                        <h3 className="font-semibold text-lg">
                          {notification.notification_type.replace(/_/g, ' ')}
                        </h3>
                        <Badge className={statusColors[notification.status]}>
                          {notification.status}
                        </Badge>
                        {notification.language === "welsh" && (
                          <Badge className="bg-red-100 text-red-800">Cymraeg</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{notification.summary}</p>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Incident: {notification.incident_date}</span>
                        <span>Notified: {notification.notification_date}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle>Submit Regulatory Notification</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Regulator *</Label>
                      <Select value={formData.regulator} onValueChange={(val) => setFormData({ ...formData, regulator: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CQC">CQC (England)</SelectItem>
                          <SelectItem value="Ofsted">Ofsted (England)</SelectItem>
                          <SelectItem value="CIW">CIW (Wales)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Language</Label>
                      <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="welsh">Welsh / Cymraeg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Notification Type *</Label>
                    <Select value={formData.notification_type} onValueChange={(val) => setFormData({ ...formData, notification_type: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["death", "serious_injury", "allegation_of_abuse", "deprivation_of_liberty", "police_involvement", "outbreak", "serious_incident", "safeguarding", "major_change", "other"].map(type => (
                          <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Incident Date *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Summary *</Label>
                    <Textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Brief summary of the incident"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Detailed Description</Label>
                    <Textarea
                      value={formData.detailed_description}
                      onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                      placeholder="Full description of what happened"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Immediate Actions Taken</Label>
                    <Textarea
                      value={formData.immediate_actions_taken}
                      onChange={(e) => setFormData({ ...formData, immediate_actions_taken: e.target.value })}
                      placeholder="Actions taken immediately following the incident"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="police"
                        checked={formData.police_informed}
                        onChange={(e) => setFormData({ ...formData, police_informed: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="police">Police Informed</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="family"
                        checked={formData.family_informed}
                        onChange={(e) => setFormData({ ...formData, family_informed: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="family">Family Informed</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                      <Send className="w-4 h-4 mr-2" />
                      {createMutation.isPending ? "Submitting..." : "Submit Notification"}
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