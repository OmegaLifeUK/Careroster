import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Phone, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  Send,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function SafeguardingInfo({ user }) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({
    concern_type: '',
    person_at_risk: '',
    description: '',
    immediate_danger: false,
    witness_details: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myReferrals = [] } = useQuery({
    queryKey: ['my-safeguarding-referrals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const data = await base44.entities.SafeguardingReferral.filter({ reported_by: user.email });
        return Array.isArray(data) ? data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const handleSubmitConcern = async () => {
    if (!reportData.concern_type || !reportData.description) {
      toast.error("Missing Information", "Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.SafeguardingReferral.create({
        ...reportData,
        reported_by: user.email,
        reporter_name: user.full_name,
        status: 'pending_review',
        date_reported: new Date().toISOString(),
        priority: reportData.immediate_danger ? 'urgent' : 'high'
      });

      // Notify safeguarding lead
      await base44.entities.Notification.create({
        title: "New Safeguarding Concern Raised",
        message: `${user.full_name} has raised a ${reportData.concern_type} safeguarding concern. ${reportData.immediate_danger ? 'IMMEDIATE DANGER REPORTED.' : ''}`,
        type: "safeguarding",
        priority: reportData.immediate_danger ? "urgent" : "high",
        is_read: false
      });

      toast.success("Concern Submitted", "Your safeguarding concern has been submitted and will be reviewed urgently");
      setShowReportForm(false);
      setReportData({
        concern_type: '',
        person_at_risk: '',
        description: '',
        immediate_danger: false,
        witness_details: ''
      });
      queryClient.invalidateQueries({ queryKey: ['my-safeguarding-referrals'] });
    } catch (error) {
      console.error("Failed to submit concern:", error);
      toast.error("Error", "Failed to submit safeguarding concern");
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyContacts = [
    { name: "Safeguarding Lead", role: "Internal", phone: "Extension 101", description: "For all safeguarding concerns during office hours" },
    { name: "On-Call Manager", role: "Internal", phone: "07XXX XXXXXX", description: "Out of hours safeguarding support" },
    { name: "Local Authority Safeguarding Team", role: "External", phone: "0XXX XXX XXXX", description: "For adult safeguarding referrals" },
    { name: "Police (Non-Emergency)", role: "External", phone: "101", description: "For non-emergency police matters" },
    { name: "Police (Emergency)", role: "External", phone: "999", description: "If someone is in immediate danger" },
    { name: "CQC", role: "External", phone: "03000 616161", description: "Care Quality Commission" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Safeguarding
        </h2>
        <Button 
          onClick={() => setShowReportForm(!showReportForm)}
          className={showReportForm ? "bg-gray-600" : "bg-red-600 hover:bg-red-700"}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {showReportForm ? "Cancel" : "Report a Concern"}
        </Button>
      </div>

      {/* Urgent Alert */}
      <Card className="border-l-4 border-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">If Someone is in Immediate Danger</h3>
              <p className="text-sm text-red-700 mt-1">
                Call 999 immediately. Do not wait. Then inform your manager and complete a safeguarding referral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Form */}
      {showReportForm && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-lg">Report a Safeguarding Concern</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Type of Concern *</label>
              <Select 
                value={reportData.concern_type} 
                onValueChange={(v) => setReportData({...reportData, concern_type: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type of concern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_abuse">Physical Abuse</SelectItem>
                  <SelectItem value="emotional_abuse">Emotional/Psychological Abuse</SelectItem>
                  <SelectItem value="sexual_abuse">Sexual Abuse</SelectItem>
                  <SelectItem value="neglect">Neglect or Acts of Omission</SelectItem>
                  <SelectItem value="financial_abuse">Financial Abuse</SelectItem>
                  <SelectItem value="discriminatory_abuse">Discriminatory Abuse</SelectItem>
                  <SelectItem value="organisational_abuse">Organisational Abuse</SelectItem>
                  <SelectItem value="self_neglect">Self-Neglect</SelectItem>
                  <SelectItem value="modern_slavery">Modern Slavery</SelectItem>
                  <SelectItem value="domestic_abuse">Domestic Abuse</SelectItem>
                  <SelectItem value="other">Other Concern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Person at Risk</label>
              <Input 
                placeholder="Name of person you are concerned about"
                value={reportData.person_at_risk}
                onChange={(e) => setReportData({...reportData, person_at_risk: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Description of Concern *</label>
              <Textarea 
                placeholder="Describe what you have seen, heard or been told. Include dates, times and any witnesses if known."
                rows={4}
                value={reportData.description}
                onChange={(e) => setReportData({...reportData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Any Witnesses?</label>
              <Input 
                placeholder="Names of any witnesses (optional)"
                value={reportData.witness_details}
                onChange={(e) => setReportData({...reportData, witness_details: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="immediate-danger"
                checked={reportData.immediate_danger}
                onChange={(e) => setReportData({...reportData, immediate_danger: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="immediate-danger" className="text-sm font-medium text-red-700">
                This person is in immediate danger
              </label>
            </div>

            <Button 
              onClick={handleSubmitConcern}
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Safeguarding Concern
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Key Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-3">
            {emergencyContacts.map((contact, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.description}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">{contact.role}</Badge>
                  <p className="font-semibold text-blue-600">{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Previous Reports */}
      {myReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Submitted Concerns</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {myReferrals.slice(0, 5).map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{referral.concern_type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(referral.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    referral.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    referral.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {referral.status === 'pending_review' ? 'Under Review' : referral.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Safeguarding Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-left">
                <p className="font-medium">Safeguarding Policy</p>
                <p className="text-xs text-gray-500">Read our full policy document</p>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-left">
                <p className="font-medium">Types of Abuse</p>
                <p className="text-xs text-gray-500">Learn to recognise the signs</p>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2 text-purple-600" />
              <span className="text-left">
                <p className="font-medium">Whistleblowing Policy</p>
                <p className="text-xs text-gray-500">How to raise concerns</p>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <ExternalLink className="w-4 h-4 mr-2 text-orange-600" />
              <span className="text-left">
                <p className="font-medium">Ann Craft Trust</p>
                <p className="text-xs text-gray-500">External safeguarding resource</p>
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}