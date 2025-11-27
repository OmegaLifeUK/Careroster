import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Home, User, MapPin, Building, Paperclip, FileText, Upload, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

import CarerSuggestions from "./CarerSuggestions";
import DocumentAttachment from "@/components/documents/DocumentAttachment";

export default function ShiftDialog({ shift, carers = [], clients = [], shifts = [], leaveRequests = [], onClose }) {
  // Determine if this is an existing shift (has id) or a new one (just pre-filled data)
  const isExistingShift = shift?.id;
  
  const [formData, setFormData] = useState({
    care_type: shift?.care_type || "residential_care",
    assignment_type: shift?.assignment_type || "location",
    client_id: shift?.client_id || "",
    property_id: shift?.property_id || "",
    location_name: shift?.location_name || "",
    location_address: shift?.location_address || "",
    carer_id: shift?.carer_id || "",
    date: shift?.date || format(new Date(), "yyyy-MM-dd"),
    start_time: shift?.start_time || "09:00",
    end_time: shift?.end_time || "17:00",
    shift_type: shift?.shift_type || "morning",
    status: shift?.carer_id ? "scheduled" : "unfilled",
    tasks: shift?.tasks?.join(", ") || "",
    notes: shift?.notes || "",
    attached_documents: shift?.attached_documents || [],
    assessment_documents: shift?.assessment_documents || [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    frequency: "weekly",
    endDate: "",
    daysOfWeek: [1], // Monday default
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  const queryClient = useQueryClient();

  // Fetch properties for supported living
  const { data: properties = [] } = useQuery({
    queryKey: ['supported-living-properties'],
    queryFn: async () => {
      const data = await base44.entities.SupportedLivingProperty.list();
      return Array.isArray(data) ? data : [];
    },
    enabled: formData.care_type === "supported_living"
  });

  // Pre-defined locations for residential care / day centre
  const predefinedLocations = [
    { name: "Main Building", address: "" },
    { name: "East Wing", address: "" },
    { name: "West Wing", address: "" },
    { name: "North Wing", address: "" },
    { name: "South Wing", address: "" },
    { name: "Day Centre", address: "" },
    { name: "Garden Suite", address: "" },
    { name: "Dementia Unit", address: "" },
    { name: "Nursing Unit", address: "" },
    { name: "Reception", address: "" },
  ];

  // Auto-set assignment type based on care type (but allow override)
  useEffect(() => {
    if (!isExistingShift) { // Only auto-set for new shifts
      if (formData.care_type === "supported_living") {
        setFormData(prev => ({ ...prev, assignment_type: "property" }));
      }
      // Don't auto-set for other types - let user choose between client and location
    }
  }, [formData.care_type, isExistingShift]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const shiftData = {
        ...data,
        tasks: data.tasks ? data.tasks.split(",").map(t => t.trim()).filter(Boolean) : [],
        duration_hours: calculateDuration(data.start_time, data.end_time),
      };

      if (isExistingShift) {
        return base44.entities.Shift.update(shift.id, shiftData);
      } else if (isRecurring && recurringSettings.endDate) {
        // Create multiple shifts for recurring
        const shifts = [];
        const startDate = new Date(data.date);
        const endDate = new Date(recurringSettings.endDate);
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          
          let shouldCreate = false;
          if (recurringSettings.frequency === "daily") {
            shouldCreate = true;
          } else if (recurringSettings.frequency === "weekly") {
            shouldCreate = recurringSettings.daysOfWeek.includes(dayOfWeek);
          } else if (recurringSettings.frequency === "fortnightly") {
            const weeksDiff = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
            shouldCreate = weeksDiff % 2 === 0 && recurringSettings.daysOfWeek.includes(dayOfWeek);
          } else if (recurringSettings.frequency === "monthly") {
            shouldCreate = currentDate.getDate() === startDate.getDate();
          }

          if (shouldCreate) {
            shifts.push({
              ...shiftData,
              date: format(currentDate, 'yyyy-MM-dd'),
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        return base44.entities.Shift.bulkCreate(shifts);
      } else {
        return base44.entities.Shift.create(shiftData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if ((field === "client_id" || field === "property_id" || field === "location_name") && value && !formData.carer_id) {
      setShowSuggestions(true);
    }
  };

  const handleAssessmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        document_name: file.name,
        document_type: "other",
        document_url: file_url,
        uploaded_date: new Date().toISOString(),
        uploaded_by: "Staff",
        notes: ""
      };
      setFormData(prev => ({
        ...prev,
        assessment_documents: [...prev.assessment_documents, newDoc]
      }));
      toast.success("Uploaded", "Assessment document attached");
    } catch (error) {
      toast.error("Upload Failed", "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAssessmentDoc = (index) => {
    setFormData(prev => ({
      ...prev,
      assessment_documents: prev.assessment_documents.filter((_, i) => i !== index)
    }));
  };

  const updateAssessmentDocType = (index, type) => {
    const updated = [...formData.assessment_documents];
    updated[index].document_type = type;
    setFormData(prev => ({ ...prev, assessment_documents: updated }));
  };

  const isAssessmentShift = ['supervision', 'shadowing'].includes(formData.shift_type) || 
    formData.notes?.toLowerCase().includes('assessment');

  const handleSelectCarer = (carerId) => {
    setFormData(prev => ({ 
      ...prev, 
      carer_id: carerId,
      status: "scheduled"
    }));
    setShowSuggestions(false);
  };

  // Check for conflicts with existing shifts
  const checkForConflicts = (carerIdToCheck, dateToCheck, startTime, endTime) => {
    if (!carerIdToCheck || !dateToCheck) return null;
    
    const conflictingShifts = shifts.filter(s => {
      if (!s || s.carer_id !== carerIdToCheck || s.date !== dateToCheck) return false;
      // Skip the current shift if editing
      if (isExistingShift && s.id === shift.id) return false;
      
      const shiftStart = s.start_time || "00:00";
      const shiftEnd = s.end_time || "23:59";
      
      // Check for time overlap
      return (
        (startTime >= shiftStart && startTime < shiftEnd) ||
        (endTime > shiftStart && endTime <= shiftEnd) ||
        (startTime <= shiftStart && endTime >= shiftEnd)
      );
    });
    
    return conflictingShifts.length > 0 ? conflictingShifts : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate based on assignment type
    if (formData.assignment_type === "client" && !formData.client_id) {
      alert("Please select a client");
      return;
    }
    if (formData.assignment_type === "property" && !formData.property_id) {
      alert("Please select a property");
      return;
    }
    if (formData.assignment_type === "location" && !formData.location_name) {
      alert("Please select a location");
      return;
    }
    
    if (!formData.date || !formData.start_time || !formData.end_time) {
      alert("Please fill in date and time fields");
      return;
    }

    // Check for scheduling conflicts
    if (formData.carer_id) {
      const conflicts = checkForConflicts(formData.carer_id, formData.date, formData.start_time, formData.end_time);
      if (conflicts) {
        const carerName = carers.find(c => c?.id === formData.carer_id)?.full_name || 'This carer';
        const conflictTimes = conflicts.map(c => `${c.start_time}-${c.end_time}`).join(', ');
        const proceed = window.confirm(
          `⚠️ Scheduling Conflict Detected!\n\n${carerName} already has shift(s) at ${conflictTimes} on this date.\n\nThis will create overlapping shifts. Are you sure you want to continue?`
        );
        if (!proceed) return;
      }
    }

    saveMutation.mutate(formData);
  };

  const selectedClient = Array.isArray(clients) ? clients.find(c => c && c.id === formData.client_id) : null;
  const activeClients = Array.isArray(clients) ? clients.filter(c => c && c.status === 'active') : [];
  const selectedProperty = Array.isArray(properties) ? properties.find(p => p && p.id === formData.property_id) : null;

  const getAssignmentLabel = () => {
    if (formData.assignment_type === "client" && selectedClient) {
      return selectedClient.full_name;
    }
    if (formData.assignment_type === "property" && selectedProperty) {
      return selectedProperty.property_name;
    }
    if (formData.assignment_type === "location" && formData.location_name) {
      return formData.location_name;
    }
    return "Not assigned";
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isExistingShift ? "Edit Shift" : "Create New Shift"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="care_type">Care Type</Label>
                <Select
                  value={formData.care_type}
                  onValueChange={(value) => handleInputChange("care_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential_care">Residential Care</SelectItem>
                    <SelectItem value="domiciliary_care">Domiciliary Care</SelectItem>
                    <SelectItem value="supported_living">Supported Living</SelectItem>
                    <SelectItem value="day_centre">Day Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignment Type Tabs */}
              <div>
                <Label className="mb-2 block">Assignment *</Label>
                <Tabs 
                  value={formData.assignment_type} 
                  onValueChange={(value) => handleInputChange("assignment_type", value)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="location">
                      <MapPin className="w-4 h-4 mr-2" />
                      Location
                    </TabsTrigger>
                    <TabsTrigger value="client">
                      <User className="w-4 h-4 mr-2" />
                      Client
                    </TabsTrigger>
                    <TabsTrigger value="property" disabled={formData.care_type !== "supported_living"}>
                      <Building className="w-4 h-4 mr-2" />
                      Property
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="client" className="mt-4">
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => handleInputChange("client_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="property" className="mt-4">
                    <Select
                      value={formData.property_id}
                      onValueChange={(value) => {
                        handleInputChange("property_id", value);
                        const prop = properties.find(p => p && p.id === value);
                        if (prop) {
                          handleInputChange("location_address", prop.address?.street || "");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.property_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="location" className="mt-4 space-y-3">
                    <Select
                      value={formData.location_name}
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          handleInputChange("location_name", "");
                        } else {
                          handleInputChange("location_name", value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedLocations.map((loc) => (
                          <SelectItem key={loc.name} value={loc.name}>
                            {loc.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">+ Add Custom Location</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.location_name === "" && (
                      <Input
                        placeholder="Enter custom location name"
                        value={formData.location_name}
                        onChange={(e) => handleInputChange("location_name", e.target.value)}
                      />
                    )}
                    <Input
                      placeholder="Address (optional)"
                      value={formData.location_address}
                      onChange={(e) => handleInputChange("location_address", e.target.value)}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange("start_time", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange("end_time", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shift_type">Shift Type</Label>
                <Select
                  value={formData.shift_type}
                  onValueChange={(value) => handleInputChange("shift_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="supervision">Supervision</SelectItem>
                    <SelectItem value="shadowing">Shadowing</SelectItem>
                    <SelectItem value="sleep_in">Sleep In</SelectItem>
                    <SelectItem value="waking_night">Waking Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tasks">Tasks (comma separated)</Label>
                <Textarea
                  id="tasks"
                  value={formData.tasks}
                  onChange={(e) => handleInputChange("tasks", e.target.value)}
                  placeholder="e.g., Medication, Personal care, Meal preparation"
                  className="h-24"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes or instructions"
                  className="h-24"
                />
              </div>

              {/* Recurring Shift Option */}
              {!isExistingShift && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="isRecurring" className="cursor-pointer font-medium">
                      Make this a recurring shift
                    </Label>
                  </div>
                  
                  {isRecurring && (
                    <div className="space-y-3 mt-3 pl-6">
                      <div>
                        <Label>Frequency</Label>
                        <Select
                          value={recurringSettings.frequency}
                          onValueChange={(value) => setRecurringSettings(prev => ({ ...prev, frequency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {recurringSettings.frequency === "weekly" && (
                        <div>
                          <Label className="mb-2 block">Days of Week</Label>
                          <div className="flex flex-wrap gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const days = recurringSettings.daysOfWeek.includes(idx)
                                    ? recurringSettings.daysOfWeek.filter(d => d !== idx)
                                    : [...recurringSettings.daysOfWeek, idx];
                                  setRecurringSettings(prev => ({ ...prev, daysOfWeek: days }));
                                }}
                                className={`px-3 py-1 rounded text-sm ${
                                  recurringSettings.daysOfWeek.includes(idx)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={recurringSettings.endDate}
                          onChange={(e) => setRecurringSettings(prev => ({ ...prev, endDate: e.target.value }))}
                          min={formData.date}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DocumentAttachment
                documents={formData.attached_documents}
                onDocumentsChange={(docs) => setFormData(prev => ({ ...prev, attached_documents: docs }))}
                entityType="shift"
                showCompletionStatus={true}
              />

              {/* Assessment Documents Section */}
              {formData.assignment_type === "client" && formData.client_id && (
                <div className="border-t pt-4 mt-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Assessment Documents
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Attach pre-admission or care assessment documents to AI-generate a care plan.
                  </p>
                  
                  <div className="space-y-2 mb-3">
                    {formData.assessment_documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded text-sm">
                        <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span className="flex-1 truncate">{doc.document_name}</span>
                        <Select
                          value={doc.document_type}
                          onValueChange={(v) => updateAssessmentDocType(index, v)}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre_admission_assessment">Pre-Admission</SelectItem>
                            <SelectItem value="care_assessment">Care Assessment</SelectItem>
                            <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                            <SelectItem value="mental_capacity">Mental Capacity</SelectItem>
                            <SelectItem value="consent_form">Consent Form</SelectItem>
                            <SelectItem value="medical_history">Medical History</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removeAssessmentDoc(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      {isUploading ? "Uploading..." : "Upload Assessment Document"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAssessmentUpload}
                      disabled={isUploading}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Assignment Summary */}
              <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <p className="text-xs text-gray-600 mb-1">Assigned To:</p>
                <p className="font-semibold text-lg text-blue-900">{getAssignmentLabel()}</p>
                {formData.location_address && (
                  <p className="text-sm text-gray-600 mt-1">{formData.location_address}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label>Assigned Carer</Label>
                {(formData.client_id || formData.property_id || formData.location_name) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                  >
                    {showSuggestions ? "Hide" : "Show"} Suggestions
                  </Button>
                )}
              </div>

              {formData.carer_id && !showSuggestions ? (
                <div className="p-4 border rounded-lg bg-green-50">
                  <p className="text-sm text-gray-600 mb-1">Currently Assigned:</p>
                  <p className="font-medium text-lg">
                    {Array.isArray(carers) && carers.find(c => c && c.id === formData.carer_id)?.full_name}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, carer_id: "", status: "unfilled" }));
                      setShowSuggestions(true);
                    }}
                  >
                    Change Carer
                  </Button>
                </div>
              ) : null}

              {showSuggestions && (formData.client_id || formData.property_id || formData.location_name) && (
                <CarerSuggestions
                  client={selectedClient}
                  carers={carers}
                  shifts={shifts}
                  leaveRequests={leaveRequests}
                  selectedDate={formData.date}
                  startTime={formData.start_time}
                  endTime={formData.end_time}
                  onSelectCarer={handleSelectCarer}
                  currentShiftId={shift?.id}
                />
              )}

              {!(formData.client_id || formData.property_id || formData.location_name) && (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-400">
                  <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select assignment first to see carer suggestions</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isExistingShift ? "Update Shift" : "Create Shift"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}