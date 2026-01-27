import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowLeft, Calendar, GraduationCap, ClipboardList, 
  FileText, StickyNote, UserX, History, Eye
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import WorkingHoursEditor from "@/components/availability/WorkingHoursEditor";
import UnavailabilityManager from "@/components/availability/UnavailabilityManager";
import CarerAvailabilitySummary from "@/components/availability/CarerAvailabilitySummary";
import CarerSupervisionHistory from "@/components/carers/CarerSupervisionHistory";

export default function CarerDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const carerId = new URLSearchParams(location.search).get('id');
  
  const [activeTab, setActiveTab] = useState("general");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [notesList, setNotesList] = useState([]);

  const { data: carer, isLoading } = useQuery({
    queryKey: ['carer', carerId],
    queryFn: async () => {
      const all = await base44.entities.Carer.list();
      const carerData = all.find(c => c.id === carerId);
      if (carerData?.notes) {
        setNotesList(Array.isArray(carerData.notes) ? carerData.notes : []);
      }
      return carerData;
    },
    enabled: !!carerId
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['carer-availability', carerId],
    queryFn: async () => {
      const data = await base44.entities.CarerAvailability.filter({ carer_id: carerId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!carerId
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['carer-shifts', carerId],
    queryFn: async () => {
      const data = await base44.entities.Shift.filter({ carer_id: carerId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!carerId
  });

  const { data: supervisions = [] } = useQuery({
    queryKey: ['carer-supervisions', carerId],
    queryFn: async () => {
      const data = await base44.entities.StaffSupervision.filter({ staff_id: carerId });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!carerId
  });

  const { data: qualifications = [] } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => {
      const data = await base44.entities.Qualification.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const updateCarerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Carer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer', carerId] });
      toast.success("Updated", "Carer details updated");
    }
  });

  const terminateCarerMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Carer.update(carerId, { status: 'inactive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carer', carerId] });
      toast.success("Terminated", "Carer status set to inactive");
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note) => {
      const user = await base44.auth.me();
      const noteObj = {
        note: note,
        added_by: user.full_name || user.email,
        added_date: new Date().toISOString(),
      };
      const updatedNotes = [...notesList, noteObj];
      await base44.entities.Carer.update(carerId, { notes: updatedNotes });
      return updatedNotes;
    },
    onSuccess: (updatedNotes) => {
      setNotesList(updatedNotes);
      queryClient.invalidateQueries({ queryKey: ['carer', carerId] });
      toast.success("Note Added", "Note has been saved");
      setNewNote("");
      setNoteDialogOpen(false);
    }
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error("Error", "Please enter a note");
      return;
    }
    addNoteMutation.mutate(newNote);
  };

  if (isLoading || !carer) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">Loading carer details...</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const carerQualifications = qualifications.filter(q => 
    carer.qualifications?.includes(q.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Carers'))}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Carers
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('Schedule') + `?carer_id=${carerId}`)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('CarerAvailability') + `?carer_id=${carerId}`)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Planning
              </Button>
              <Button
                variant="outline"
                onClick={terminateCarerMutation.mutate}
                disabled={carer.status === 'inactive' || terminateCarerMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <UserX className="w-4 h-4 mr-2" />
                Terminate
              </Button>
              <Button variant="outline">
                <History className="w-4 h-4 mr-2" />
                Audit Log
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Employee: {carer.full_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(carer.status)}>
                  {carer.status}
                </Badge>
                {carer.employment_type && (
                  <Badge variant="outline" className="capitalize">
                    {carer.employment_type.replace(/_/g, ' ')}
                  </Badge>
                )}
                {carer.email && (
                  <span className="text-sm text-gray-500">{carer.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="availability">
              Availability
            </TabsTrigger>
            <TabsTrigger value="training">
              Training & Qualifications
              {carerQualifications.length > 0 && (
                <Badge className="ml-2 bg-blue-500">{carerQualifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="supervisions">
              Supervisions
              {supervisions.length > 0 && (
                <Badge className="ml-2 bg-purple-500">{supervisions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shifts">
              Shifts
              {shifts.length > 0 && (
                <Badge className="ml-2 bg-green-500">{shifts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <p className="text-gray-900 mt-1">{carer.full_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900 mt-1">{carer.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-gray-900 mt-1">{carer.phone || 'Not provided'}</p>
                      </div>
                      {carer.address && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address</label>
                          <p className="text-gray-900 mt-1">
                            {carer.address.street && `${carer.address.street}, `}
                            {carer.address.city && `${carer.address.city} `}
                            {carer.address.postcode}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-4">Employment Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Employment Type</label>
                        <p className="text-gray-900 mt-1 capitalize">
                          {carer.employment_type?.replace(/_/g, ' ') || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Hourly Rate</label>
                        <p className="text-gray-900 mt-1">
                          {carer.hourly_rate ? `£${carer.hourly_rate.toFixed(2)}/hr` : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <p className="text-gray-900 mt-1 capitalize">{carer.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Overtime Available</label>
                        <p className="text-gray-900 mt-1">
                          {carer.available_for_overtime ? 'Yes' : 'No'}
                          {carer.overtime_max_hours && ` (max ${carer.overtime_max_hours} hrs/week)`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {carer.emergency_contact && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-4">Emergency Contact</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <p className="text-gray-900 mt-1">{carer.emergency_contact.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-gray-900 mt-1">{carer.emergency_contact.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Relationship</label>
                        <p className="text-gray-900 mt-1">{carer.emergency_contact.relationship}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(carer.dbscertificate_number || carer.dbs_expiry) && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-4">DBS Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {carer.dbscertificate_number && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">DBS Certificate Number</label>
                          <p className="text-gray-900 mt-1">{carer.dbscertificate_number}</p>
                        </div>
                      )}
                      {carer.dbs_expiry && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">DBS Expiry</label>
                          <p className="text-gray-900 mt-1">
                            {format(new Date(carer.dbs_expiry), 'PPP')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <Tabs defaultValue="working-hours" className="space-y-4">
              <TabsList className="bg-white border">
                <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
                <TabsTrigger value="unavailability">Unavailability</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="working-hours">
                <WorkingHoursEditor carerId={carerId} availability={availability} />
              </TabsContent>

              <TabsContent value="unavailability">
                <UnavailabilityManager carerId={carerId} availability={availability} />
              </TabsContent>

              <TabsContent value="summary">
                <CarerAvailabilitySummary carerId={carerId} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Qualifications</h3>
                  <Button size="sm">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Add Qualification
                  </Button>
                </div>
                
                {carerQualifications.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No qualifications recorded</p>
                ) : (
                  <div className="space-y-3">
                    {carerQualifications.map((qual) => (
                      <div key={qual.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{qual.name}</p>
                            {qual.description && (
                              <p className="text-sm text-gray-600 mt-1">{qual.description}</p>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800">Certified</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supervisions">
            <CarerSupervisionHistory carerId={carerId} />
          </TabsContent>

          <TabsContent value="shifts">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Recent Shifts</h3>
                  <Button 
                    size="sm"
                    onClick={() => navigate(createPageUrl('Schedule') + `?carer_id=${carerId}`)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>

                {shifts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No shifts recorded</p>
                ) : (
                  <div className="space-y-2">
                    {shifts.slice(0, 10).map((shift) => (
                      <div key={shift.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {format(new Date(shift.date), 'EEE, MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {shift.start_time} - {shift.end_time} • {shift.duration_hours}hrs
                          </p>
                        </div>
                        <Badge className={
                          shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                          shift.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {shift.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Documents</h3>
                  <Button size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                {!carer.attached_documents || carer.attached_documents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {carer.attached_documents.map((doc, idx) => (
                      <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{doc.document_name}</p>
                            <p className="text-sm text-gray-600">
                              {doc.document_type} • Uploaded {doc.uploaded_date}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Notes</h3>
                  <Button size="sm" onClick={() => setNoteDialogOpen(true)}>
                    <StickyNote className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>

                {notesList.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No notes recorded</p>
                ) : (
                  <div className="space-y-3">
                    {notesList.map((note, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                        <p className="text-gray-900 whitespace-pre-wrap">{note.note}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                          <span className="font-medium">{note.added_by}</span>
                          <span>•</span>
                          <span>
                            {(() => {
                              try {
                                return format(new Date(note.added_date), 'PPp');
                              } catch {
                                return note.added_date;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note here..."
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={addNoteMutation.isPending}>
              {addNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}