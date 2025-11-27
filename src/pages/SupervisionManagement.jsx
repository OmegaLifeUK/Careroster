import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Calendar, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Upload,
  X,
  CalendarPlus,
  Loader2,
  Paperclip
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addWeeks, addMonths, isPast, differenceInDays } from "date-fns";
import DocumentAttachment from "@/components/documents/DocumentAttachment";

export default function SupervisionManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedSupervision, setSelectedSupervision] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const [formData, setFormData] = useState({
    staff_id: "",
    supervisor_id: "",
    supervision_date: "",
    supervision_type: "formal_one_to_one",
    frequency_due: "monthly",
    next_supervision_due: "",
    supervisor_comments: "",
    staff_comments: "",
    actions_agreed: [],
    document_url: "",
    attached_documents: []
  });

  const [scheduleData, setScheduleData] = useState({
    staff_id: "",
    supervisor_id: "",
    scheduled_date: "",
    scheduled_time: "10:00",
    supervision_type: "formal_one_to_one",
    frequency_due: "monthly",
    notes: ""
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: supervisions = [], isLoading: loadingSupervisions } = useQuery({
    queryKey: ['staff-supervisions'],
    queryFn: () => base44.entities.StaffSupervision.list('-supervision_date'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['all-staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['all-carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const allStaff = [...staff, ...carers];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffSupervision.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-supervisions'] });
      toast.success("Supervision Added", "The supervision record has been created");
      setShowAddForm(false);
      setShowScheduleForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error", "Failed to create supervision record");
      console.error(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffSupervision.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-supervisions'] });
      toast.success("Deleted", "Supervision record removed");
      setSelectedSupervision(null);
    }
  });

  const resetForm = () => {
    setFormData({
      staff_id: "",
      supervisor_id: "",
      supervision_date: "",
      supervision_type: "formal_one_to_one",
      frequency_due: "monthly",
      next_supervision_due: "",
      supervisor_comments: "",
      staff_comments: "",
      actions_agreed: [],
      document_url: ""
    });
    setScheduleData({
      staff_id: "",
      supervisor_id: "",
      scheduled_date: "",
      scheduled_time: "10:00",
      supervision_type: "formal_one_to_one",
      frequency_due: "monthly",
      notes: ""
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, document_url: file_url });
      toast.success("Document Uploaded", "File attached to supervision");
    } catch (error) {
      toast.error("Upload Failed", "Could not upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const calculateNextDue = (date, frequency) => {
    const supervisionDate = new Date(date);
    switch (frequency) {
      case "monthly": return addMonths(supervisionDate, 1);
      case "6_weekly": return addWeeks(supervisionDate, 6);
      case "8_weekly": return addWeeks(supervisionDate, 8);
      case "quarterly": return addMonths(supervisionDate, 3);
      default: return addMonths(supervisionDate, 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.staff_id || !formData.supervisor_id || !formData.supervision_date) {
      toast.error("Required Fields", "Please fill in staff, supervisor and date");
      return;
    }

    const nextDue = calculateNextDue(formData.supervision_date, formData.frequency_due);
    
    createMutation.mutate({
      ...formData,
      next_supervision_due: format(nextDue, 'yyyy-MM-dd')
    });
  };

  const handleScheduleSubmit = () => {
    if (!scheduleData.staff_id || !scheduleData.supervisor_id || !scheduleData.scheduled_date) {
      toast.error("Required Fields", "Please fill in staff, supervisor and date");
      return;
    }

    const nextDue = calculateNextDue(scheduleData.scheduled_date, scheduleData.frequency_due);
    
    createMutation.mutate({
      staff_id: scheduleData.staff_id,
      supervisor_id: scheduleData.supervisor_id,
      supervision_date: scheduleData.scheduled_date,
      supervision_type: scheduleData.supervision_type,
      frequency_due: scheduleData.frequency_due,
      next_supervision_due: format(nextDue, 'yyyy-MM-dd'),
      supervisor_comments: `Scheduled for ${scheduleData.scheduled_time}. ${scheduleData.notes}`
    });
  };

  const getStaffName = (id) => {
    const person = allStaff.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  const getSupervisionStatus = (supervision) => {
    if (!supervision.next_supervision_due) return { status: "completed", color: "bg-green-100 text-green-800" };
    
    const daysUntilDue = differenceInDays(new Date(supervision.next_supervision_due), new Date());
    
    if (daysUntilDue < 0) return { status: "overdue", color: "bg-red-100 text-red-800" };
    if (daysUntilDue <= 7) return { status: "due_soon", color: "bg-orange-100 text-orange-800" };
    return { status: "on_track", color: "bg-green-100 text-green-800" };
  };

  const filteredSupervisions = supervisions.filter(s => {
    const staffName = getStaffName(s.staff_id).toLowerCase();
    const matchesSearch = staffName.includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    
    const status = getSupervisionStatus(s).status;
    return matchesSearch && status === filterStatus;
  });

  // Get staff members who are overdue for supervision
  const overdueStaff = allStaff.filter(staffMember => {
    const latestSupervision = supervisions.find(s => s.staff_id === staffMember.id);
    if (!latestSupervision) return true;
    return getSupervisionStatus(latestSupervision).status === "overdue";
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Supervisions</h1>
          <p className="text-gray-600">Manage and schedule staff supervision sessions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowScheduleForm(true)} variant="outline">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Schedule Supervision
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Record Supervision
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("all")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supervisions.length}</p>
                <p className="text-sm text-gray-600">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("on_track")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {supervisions.filter(s => getSupervisionStatus(s).status === "on_track").length}
                </p>
                <p className="text-sm text-gray-600">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("due_soon")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {supervisions.filter(s => getSupervisionStatus(s).status === "due_soon").length}
                </p>
                <p className="text-sm text-gray-600">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
          onClick={() => setFilterStatus("overdue")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{overdueStaff.length}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueStaff.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Overdue Supervisions</h3>
                <p className="text-sm text-red-700 mt-1">
                  The following staff need supervision: {overdueStaff.slice(0, 5).map(s => s.full_name).join(", ")}
                  {overdueStaff.length > 5 && ` and ${overdueStaff.length - 5} more`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by staff name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-64"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Supervisions</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Supervision List */}
      <div className="grid gap-4">
        {loadingSupervisions ? (
          <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
        ) : filteredSupervisions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No supervision records found</p>
            </CardContent>
          </Card>
        ) : (
          filteredSupervisions.map((supervision) => {
            const status = getSupervisionStatus(supervision);
            return (
              <Card key={supervision.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold">
                          {getStaffName(supervision.staff_id).charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{getStaffName(supervision.staff_id)}</h3>
                        <p className="text-sm text-gray-600">
                          Supervised by {getStaffName(supervision.supervisor_id)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {format(new Date(supervision.supervision_date), 'dd MMM yyyy')}
                          </Badge>
                          <Badge className={status.color}>
                            {status.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {supervision.supervision_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSupervision(supervision)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(supervision.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {supervision.next_supervision_due && (
                    <p className="text-sm text-gray-500 mt-2 ml-16">
                      Next due: {format(new Date(supervision.next_supervision_due), 'dd MMM yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Supervision Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Record Supervision</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddForm(false); resetForm(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Staff Member *</label>
                  <Select value={formData.staff_id} onValueChange={(v) => setFormData({ ...formData, staff_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStaff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Supervisor *</label>
                  <Select value={formData.supervisor_id} onValueChange={(v) => setFormData({ ...formData, supervisor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStaff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Supervision Date *</label>
                  <Input
                    type="date"
                    value={formData.supervision_date}
                    onChange={(e) => setFormData({ ...formData, supervision_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Supervision Type</label>
                  <Select value={formData.supervision_type} onValueChange={(v) => setFormData({ ...formData, supervision_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal_one_to_one">Formal 1:1</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="probation_review">Probation Review</SelectItem>
                      <SelectItem value="spot_check">Spot Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Frequency</label>
                <Select value={formData.frequency_due} onValueChange={(v) => setFormData({ ...formData, frequency_due: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="6_weekly">6 Weekly</SelectItem>
                    <SelectItem value="8_weekly">8 Weekly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Supervisor Notes</label>
                <Textarea
                  value={formData.supervisor_comments}
                  onChange={(e) => setFormData({ ...formData, supervisor_comments: e.target.value })}
                  rows={4}
                  placeholder="Enter supervision notes and discussion points..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Staff Comments</label>
                <Textarea
                  value={formData.staff_comments}
                  onChange={(e) => setFormData({ ...formData, staff_comments: e.target.value })}
                  rows={3}
                  placeholder="Staff member's feedback..."
                />
              </div>

              <DocumentAttachment
                documents={formData.attached_documents}
                onDocumentsChange={(docs) => setFormData({ ...formData, attached_documents: docs })}
                entityType="supervision"
                showCompletionStatus={false}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Supervision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Supervision Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Schedule Supervision</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowScheduleForm(false); resetForm(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Staff Member *</label>
                <Select value={scheduleData.staff_id} onValueChange={(v) => setScheduleData({ ...scheduleData, staff_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Supervisor *</label>
                <Select value={scheduleData.supervisor_id} onValueChange={(v) => setScheduleData({ ...scheduleData, supervisor_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={scheduleData.scheduled_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={scheduleData.scheduled_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Supervision Type</label>
                <Select value={scheduleData.supervision_type} onValueChange={(v) => setScheduleData({ ...scheduleData, supervision_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal_one_to_one">Formal 1:1</SelectItem>
                    <SelectItem value="informal">Informal</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="probation_review">Probation Review</SelectItem>
                    <SelectItem value="spot_check">Spot Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Frequency</label>
                <Select value={scheduleData.frequency_due} onValueChange={(v) => setScheduleData({ ...scheduleData, frequency_due: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="6_weekly">6 Weekly</SelectItem>
                    <SelectItem value="8_weekly">8 Weekly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any notes for this supervision..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowScheduleForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Schedule Supervision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Supervision Detail Modal */}
      {selectedSupervision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Supervision Details</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedSupervision(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Staff Member</p>
                  <p className="font-medium">{getStaffName(selectedSupervision.staff_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supervisor</p>
                  <p className="font-medium">{getStaffName(selectedSupervision.supervisor_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSupervision.supervision_date), 'dd MMMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge>{selectedSupervision.supervision_type?.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              {selectedSupervision.supervisor_comments && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Supervisor Notes</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedSupervision.supervisor_comments}
                  </div>
                </div>
              )}

              {selectedSupervision.staff_comments && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Staff Comments</p>
                  <div className="p-3 bg-blue-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedSupervision.staff_comments}
                  </div>
                </div>
              )}

              {selectedSupervision.actions_agreed?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Actions Agreed</p>
                  <ul className="space-y-2">
                    {selectedSupervision.actions_agreed.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>{action.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedSupervision.attached_documents?.length > 0 || selectedSupervision.document_url) && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Attached Documents</p>
                  {selectedSupervision.document_url && (
                    <a
                      href={selectedSupervision.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 mb-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Document
                    </a>
                  )}
                  {selectedSupervision.attached_documents?.length > 0 && (
                    <DocumentAttachment
                      documents={selectedSupervision.attached_documents}
                      onDocumentsChange={() => {}}
                      entityType="supervision"
                      editable={false}
                    />
                  )}
                </div>
              )}

              {selectedSupervision.next_supervision_due && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">Next Supervision Due</p>
                  <p className="font-medium">
                    {format(new Date(selectedSupervision.next_supervision_due), 'dd MMMM yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}