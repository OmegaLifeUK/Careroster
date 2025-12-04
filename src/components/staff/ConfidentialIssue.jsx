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
  Lock, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  Phone,
  Mail
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ConfidentialIssue({ user }) {
  const [issueData, setIssueData] = useState({
    category: '',
    subject: '',
    description: '',
    preferred_contact: 'email',
    is_anonymous: false,
    urgency: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myIssues = [] } = useQuery({
    queryKey: ['my-confidential-issues', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const data = await base44.entities.Complaint.filter({ raised_by_email: user.email });
        return Array.isArray(data) ? data.filter(c => c.is_confidential).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const getRecipientInfo = (category) => {
    const recipients = {
      'bullying_harassment': { 
        name: 'HR Manager', 
        description: 'All bullying and harassment issues are handled confidentially by HR',
        email: 'hr@company.com'
      },
      'discrimination': { 
        name: 'HR Manager & Equality Lead', 
        description: 'Discrimination concerns are treated with the highest priority',
        email: 'hr@company.com'
      },
      'management_concerns': { 
        name: 'Senior Management', 
        description: 'Issues about your direct manager go to senior leadership',
        email: 'seniormanagement@company.com'
      },
      'health_safety': { 
        name: 'Health & Safety Officer', 
        description: 'Health and safety concerns for investigation',
        email: 'healthsafety@company.com'
      },
      'malpractice': { 
        name: 'Registered Manager & Compliance', 
        description: 'Professional misconduct or malpractice concerns',
        email: 'compliance@company.com'
      },
      'whistleblowing': { 
        name: 'External Whistleblowing Service', 
        description: 'Independent external handling if internal routes are not suitable',
        email: 'protect-advice.org.uk'
      },
      'personal_grievance': { 
        name: 'HR Manager', 
        description: 'Personal workplace grievances and disputes',
        email: 'hr@company.com'
      },
      'other': { 
        name: 'HR Manager', 
        description: 'General confidential matters',
        email: 'hr@company.com'
      }
    };
    return recipients[category] || recipients['other'];
  };

  const handleSubmit = async () => {
    if (!issueData.category || !issueData.subject || !issueData.description) {
      toast.error("Missing Information", "Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    const recipient = getRecipientInfo(issueData.category);

    try {
      await base44.entities.Complaint.create({
        type: 'staff_confidential',
        category: issueData.category,
        subject: issueData.subject,
        description: issueData.description,
        raised_by_email: issueData.is_anonymous ? null : user.email,
        raised_by_name: issueData.is_anonymous ? 'Anonymous' : user.full_name,
        is_confidential: true,
        is_anonymous: issueData.is_anonymous,
        preferred_contact: issueData.preferred_contact,
        urgency: issueData.urgency,
        status: 'new',
        assigned_to: recipient.name,
        date_raised: new Date().toISOString()
      });

      // Notify the appropriate person
      await base44.entities.Notification.create({
        title: `Confidential Issue Raised: ${issueData.category.replace(/_/g, ' ')}`,
        message: `A confidential ${issueData.urgency === 'urgent' ? 'URGENT ' : ''}issue has been raised requiring your attention. Category: ${issueData.category.replace(/_/g, ' ')}`,
        type: "confidential",
        priority: issueData.urgency === 'urgent' ? "urgent" : "high",
        is_read: false
      });

      toast.success("Issue Submitted", "Your confidential issue has been securely submitted");
      setIssueData({
        category: '',
        subject: '',
        description: '',
        preferred_contact: 'email',
        is_anonymous: false,
        urgency: 'normal'
      });
      queryClient.invalidateQueries({ queryKey: ['my-confidential-issues'] });
    } catch (error) {
      console.error("Failed to submit issue:", error);
      toast.error("Error", "Failed to submit your issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recipient = issueData.category ? getRecipientInfo(issueData.category) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lock className="w-5 h-5 text-indigo-600" />
        <h2 className="text-xl font-semibold">Raise a Confidential Issue</h2>
      </div>

      {/* Privacy Notice */}
      <Card className="border-l-4 border-indigo-500 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-indigo-900">Your Privacy is Protected</h3>
              <p className="text-sm text-indigo-700 mt-1">
                All issues raised here are treated with strict confidentiality. Only the designated recipient will have access 
                to your submission. You can choose to remain anonymous if you prefer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submit Your Concern</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Category of Issue *</label>
            <Select 
              value={issueData.category} 
              onValueChange={(v) => setIssueData({...issueData, category: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="What is your concern about?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullying_harassment">Bullying or Harassment</SelectItem>
                <SelectItem value="discrimination">Discrimination</SelectItem>
                <SelectItem value="management_concerns">Concerns About Management</SelectItem>
                <SelectItem value="health_safety">Health & Safety Issue</SelectItem>
                <SelectItem value="malpractice">Professional Malpractice</SelectItem>
                <SelectItem value="whistleblowing">Whistleblowing (External)</SelectItem>
                <SelectItem value="personal_grievance">Personal Grievance</SelectItem>
                <SelectItem value="other">Other Confidential Matter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show recipient info */}
          {recipient && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">This will be sent to: {recipient.name}</span>
                </div>
                <p className="text-sm text-blue-700">{recipient.description}</p>
              </CardContent>
            </Card>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Subject *</label>
            <Input 
              placeholder="Brief subject line for your issue"
              value={issueData.subject}
              onChange={(e) => setIssueData({...issueData, subject: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Describe Your Concern *</label>
            <Textarea 
              placeholder="Please provide as much detail as possible. Include dates, times, names, and any evidence you may have."
              rows={5}
              value={issueData.description}
              onChange={(e) => setIssueData({...issueData, description: e.target.value})}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Urgency</label>
              <Select 
                value={issueData.urgency} 
                onValueChange={(v) => setIssueData({...issueData, urgency: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent - Needs Immediate Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Preferred Contact Method</label>
              <Select 
                value={issueData.preferred_contact} 
                onValueChange={(v) => setIssueData({...issueData, preferred_contact: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="meeting">In-Person Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input 
              type="checkbox"
              id="anonymous"
              checked={issueData.is_anonymous}
              onChange={(e) => setIssueData({...issueData, is_anonymous: e.target.checked})}
              className="w-4 h-4"
            />
            <label htmlFor="anonymous" className="flex items-center gap-2 cursor-pointer">
              {issueData.is_anonymous ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              <span className="text-sm font-medium">Submit anonymously</span>
            </label>
            {issueData.is_anonymous && (
              <Badge className="bg-gray-200 text-gray-700">Your identity will be hidden</Badge>
            )}
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !issueData.category || !issueData.subject || !issueData.description}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Confidentially
          </Button>
        </CardContent>
      </Card>

      {/* External Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">External Support & Advice</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            If you don't feel comfortable raising an issue internally, or need independent advice, 
            these external organisations can help:
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">ACAS</p>
                <p className="text-sm text-gray-500">Free workplace advice service</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-blue-600">0300 123 1100</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Protect (Whistleblowing Charity)</p>
                <p className="text-sm text-gray-500">Independent whistleblowing advice</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-blue-600">020 3117 2520</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">CQC</p>
                <p className="text-sm text-gray-500">Report concerns about care quality</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-blue-600">03000 616161</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Previous Issues */}
      {myIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Submitted Issues</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {myIssues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{issue.subject}</p>
                    <p className="text-sm text-gray-500">
                      {issue.category?.replace(/_/g, ' ')} • {new Date(issue.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    issue.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {issue.status === 'new' ? 'Submitted' : issue.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}