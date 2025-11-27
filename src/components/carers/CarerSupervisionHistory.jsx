import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Eye,
  X
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function CarerSupervisionHistory({ carerId, carerName, allStaff = [] }) {
  const [selectedSupervision, setSelectedSupervision] = useState(null);

  const { data: supervisions = [], isLoading } = useQuery({
    queryKey: ['carer-supervisions', carerId],
    queryFn: async () => {
      const data = await base44.entities.StaffSupervision.filter(
        { staff_id: carerId },
        '-supervision_date'
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!carerId
  });

  // Fetch form submissions for supervisions that have them
  const { data: formSubmissions = [] } = useQuery({
    queryKey: ['supervision-form-submissions', supervisions.map(s => s.form_submission_id).filter(Boolean)],
    queryFn: async () => {
      const ids = supervisions.map(s => s.form_submission_id).filter(Boolean);
      if (ids.length === 0) return [];
      const data = await base44.entities.FormSubmission.list();
      return Array.isArray(data) ? data.filter(s => ids.includes(s.id)) : [];
    },
    enabled: supervisions.some(s => s.form_submission_id)
  });

  const getStaffName = (id) => {
    const person = allStaff.find(s => s.id === id);
    return person?.full_name || "Unknown";
  };

  const getSupervisionStatus = (supervision) => {
    if (!supervision.next_supervision_due) return { status: "completed", color: "bg-green-100 text-green-800", icon: CheckCircle };
    
    const daysUntilDue = differenceInDays(new Date(supervision.next_supervision_due), new Date());
    
    if (daysUntilDue < 0) return { status: "overdue", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    if (daysUntilDue <= 7) return { status: "due soon", color: "bg-orange-100 text-orange-800", icon: Clock };
    return { status: "on track", color: "bg-green-100 text-green-800", icon: CheckCircle };
  };

  const latestSupervision = supervisions[0];
  const nextDueStatus = latestSupervision ? getSupervisionStatus(latestSupervision) : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Supervision History
          </CardTitle>
          {nextDueStatus && (
            <Badge className={nextDueStatus.color}>
              <nextDueStatus.icon className="w-3 h-3 mr-1" />
              Next: {nextDueStatus.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Loading...</p>
        ) : supervisions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No supervision records</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supervisions.slice(0, 5).map((supervision) => {
              const status = getSupervisionStatus(supervision);
              const hasForm = supervision.form_submission_id || supervision.attached_documents?.some(d => d.form_submission_id);
              
              return (
                <div
                  key={supervision.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSupervision(supervision)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {format(new Date(supervision.supervision_date), 'dd MMM yyyy')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {supervision.supervision_type?.replace(/_/g, ' ')}
                        </Badge>
                        {hasForm && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Form
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Supervised by {getStaffName(supervision.supervisor_id)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {supervisions.length > 5 && (
              <p className="text-center text-sm text-gray-500">
                +{supervisions.length - 5} more records
              </p>
            )}
          </div>
        )}

        {/* Supervision Detail Modal */}
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
                    <p className="font-medium">{carerName}</p>
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

                {/* Show attached form */}
                {(selectedSupervision.form_submission_id || selectedSupervision.attached_documents?.length > 0) && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Attached Documents</p>
                    <div className="space-y-2">
                      {selectedSupervision.attached_documents?.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{doc.document_name}</p>
                            <p className="text-xs text-gray-500">
                              {doc.completed ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Completed {doc.completed_date ? format(new Date(doc.completed_date), 'dd MMM yyyy') : ''}
                                </span>
                              ) : (
                                <span className="text-orange-600">Pending</span>
                              )}
                            </p>
                          </div>
                          {doc.document_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(doc.document_url, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
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
      </CardContent>
    </Card>
  );
}