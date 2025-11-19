import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";

export default function NotificationForm({ formData, setFormData, onSubmit, onCancel, isSubmitting }) {
  return (
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
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onSubmit} disabled={isSubmitting}>
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Submitting..." : "Submit Notification"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}