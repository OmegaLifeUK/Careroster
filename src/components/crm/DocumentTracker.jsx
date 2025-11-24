import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Send, Eye, CheckCircle, Clock, PenTool, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, differenceInDays } from "date-fns";

export default function DocumentTracker() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [signatureData, setSignatureData] = useState({ signed_by: "", signature_url: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [] } = useQuery({
    queryKey: ['crm-documents'],
    queryFn: async () => {
      const data = await base44.entities.CRMDocument.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const updateRAGStatus = (doc) => {
    if (!doc.due_date || doc.status === "completed" || doc.status === "signed") return null;
    
    const daysUntilDue = differenceInDays(new Date(doc.due_date), new Date());
    
    if (daysUntilDue < 0) return "red"; // Overdue
    if (daysUntilDue <= 2) return "amber"; // Due soon
    return "green"; // On track
  };

  const sendReminderMutation = useMutation({
    mutationFn: async (docId) => {
      const doc = documents.find(d => d.id === docId);
      
      await base44.integrations.Core.SendEmail({
        to: doc.recipient_email,
        subject: `Reminder: ${doc.document_name} - Action Required`,
        body: `Dear ${doc.recipient_name},

This is a friendly reminder that we are still awaiting completion of the following document:

Document: ${doc.document_name}
Due Date: ${format(new Date(doc.due_date), 'MMMM d, yyyy')}

Please complete this at your earliest convenience to avoid any delays in your care assessment process.

If you have any questions or need assistance, please contact us.

Best regards,
Care Team`,
      });

      await base44.entities.CRMDocument.update(docId, {
        reminder_sent: true,
        reminder_count: (doc.reminder_count || 0) + 1,
        last_reminder_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-documents'] });
      toast.success("Reminder Sent", "Email reminder sent to recipient");
    },
  });

  const markAsSignedMutation = useMutation({
    mutationFn: async ({ docId, data }) => {
      await base44.entities.CRMDocument.update(docId, {
        status: "signed",
        signature_status: "signed",
        signed_by: data.signed_by,
        signed_date: new Date().toISOString(),
        signature_url: data.signature_url,
        completed_date: new Date().toISOString(),
        rag_status: "green",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-documents'] });
      toast.success("Document Signed", "Signature recorded successfully");
      setShowSignatureDialog(false);
      setSelectedDocument(null);
      setSignatureData({ signed_by: "", signature_url: "" });
    },
  });

  const filteredDocuments = documents.filter(d => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return ["sent", "viewed"].includes(d.status);
    return d.status === statusFilter;
  });

  // Update RAG status for documents
  React.useEffect(() => {
    documents.forEach(doc => {
      const newRAG = updateRAGStatus(doc);
      if (newRAG && newRAG !== doc.rag_status) {
        base44.entities.CRMDocument.update(doc.id, { rag_status: newRAG });
      }
    });
  }, [documents]);

  const ragColors = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    draft: <FileText className="w-5 h-5 text-gray-400" />,
    sent: <Send className="w-5 h-5 text-blue-500" />,
    viewed: <Eye className="w-5 h-5 text-purple-500" />,
    completed: <CheckCircle className="w-5 h-5 text-green-500" />,
    signed: <PenTool className="w-5 h-5 text-emerald-500" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(doc => {
          const daysUntilDue = doc.due_date ? differenceInDays(new Date(doc.due_date), new Date()) : null;
          
          return (
            <Card key={doc.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {statusIcons[doc.status]}
                    <div>
                      <h3 className="font-semibold">{doc.document_name}</h3>
                      <p className="text-sm text-gray-600">{doc.document_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {doc.rag_status && (
                    <Badge className={ragColors[doc.rag_status]}>
                      {doc.rag_status}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm"><span className="font-medium">To:</span> {doc.recipient_name}</p>
                  {doc.sent_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Send className="w-3 h-3" />
                      Sent: {format(new Date(doc.sent_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {doc.due_date && (
                    <div className={`flex items-center gap-2 text-sm ${daysUntilDue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      <Clock className="w-3 h-3" />
                      Due: {format(new Date(doc.due_date), 'MMM d, yyyy')}
                      {daysUntilDue !== null && daysUntilDue < 0 && ` (${Math.abs(daysUntilDue)} days overdue)`}
                    </div>
                  )}
                  {doc.requires_signature && (
                    <div className="flex items-center gap-2 text-sm">
                      <PenTool className="w-3 h-3 text-purple-500" />
                      <span className={doc.signature_status === "signed" ? "text-green-600" : "text-orange-600"}>
                        {doc.signature_status === "signed" ? "Signed" : "Signature Required"}
                      </span>
                    </div>
                  )}
                  {doc.reminder_count > 0 && (
                    <p className="text-xs text-gray-500">
                      {doc.reminder_count} reminder{doc.reminder_count > 1 ? 's' : ''} sent
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {["sent", "viewed"].includes(doc.status) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendReminderMutation.mutate(doc.id)}
                      disabled={sendReminderMutation.isPending}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Send Reminder
                    </Button>
                  )}
                  {doc.requires_signature && doc.signature_status !== "signed" && (
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setSignatureData({ signed_by: doc.recipient_name, signature_url: "" });
                        setShowSignatureDialog(true);
                      }}
                    >
                      <PenTool className="w-3 h-3 mr-1" />
                      Record Signature
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No documents found</p>
          </CardContent>
        </Card>
      )}

      {showSignatureDialog && selectedDocument && (
        <Dialog open onOpenChange={() => {
          setShowSignatureDialog(false);
          setSelectedDocument(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Digital Signature</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Document: <span className="font-medium">{selectedDocument.document_name}</span>
              </p>
              
              <div>
                <Label>Signed By</Label>
                <Input 
                  value={signatureData.signed_by} 
                  onChange={(e) => setSignatureData({...signatureData, signed_by: e.target.value})}
                />
              </div>

              <div>
                <Label>Signature Image URL (optional)</Label>
                <Input 
                  placeholder="https://..."
                  value={signatureData.signature_url} 
                  onChange={(e) => setSignatureData({...signatureData, signature_url: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">URL to uploaded signature image</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => markAsSignedMutation.mutate({ 
                  docId: selectedDocument.id, 
                  data: signatureData 
                })}
                disabled={!signatureData.signed_by || markAsSignedMutation.isPending}
              >
                Confirm Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}