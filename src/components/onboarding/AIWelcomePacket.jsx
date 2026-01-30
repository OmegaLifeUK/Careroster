import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Mail, Download, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIWelcomePacket({ staffMember }) {
  const [welcomePacket, setWelcomePacket] = useState(null);
  const { toast } = useToast();

  const { data: orgProfile } = useQuery({
    queryKey: ['organisation-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        const staff = await base44.entities.Staff.list();
        return staff.filter(s => s.is_active).slice(0, 10);
      } catch {
        return [];
      }
    }
  });

  const generatePacketMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Create a comprehensive and welcoming onboarding welcome packet for a new employee:

New Employee: ${staffMember.full_name}
Role: ${staffMember.care_setting || 'Care Worker'}
Organization: ${orgProfile?.organisation_name || 'Our Care Organization'}
Care Settings: ${orgProfile?.care_setting_types?.join(', ') || 'Various care settings'}

Team Members to Introduce:
${teamMembers?.map(m => `- ${m.full_name} (${m.care_setting || 'Care Team'})`).join('\n') || 'Team members to be introduced'}

Generate a warm, professional welcome packet that includes:
1. Personal welcome message from leadership
2. Overview of our organization's mission, values, and culture
3. Introduction to key team members they'll be working with
4. First week priorities and tasks
5. Important contact information
6. Tips for success in their first 30 days
7. Answers to common new employee questions
8. Links to key resources and systems

Make it warm, encouraging, and informative. Focus on making the new employee feel valued and prepared.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            welcome_message: { type: "string" },
            organization_overview: { type: "string" },
            mission_and_values: { type: "string" },
            team_introductions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  bio: { type: "string" }
                }
              }
            },
            first_week_tasks: { type: "array", items: { type: "string" } },
            first_30_days_tips: { type: "array", items: { type: "string" } },
            important_contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  contact: { type: "string" }
                }
              }
            },
            faqs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" }
                }
              }
            },
            closing_message: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (packet) => {
      setWelcomePacket(packet);
      toast.success("Welcome Packet Created", "AI-generated welcome packet is ready");
    },
    onError: (error) => {
      toast.error("Generation Failed", error.message);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const emailBody = `
<h1>Welcome to ${orgProfile?.organisation_name || 'Our Team'}!</h1>

<h2>Welcome Message</h2>
<p>${welcomePacket.welcome_message}</p>

<h2>About Our Organization</h2>
<p>${welcomePacket.organization_overview}</p>

<h2>Mission & Values</h2>
<p>${welcomePacket.mission_and_values}</p>

<h2>Your First Week Tasks</h2>
<ul>
${welcomePacket.first_week_tasks.map(task => `<li>${task}</li>`).join('\n')}
</ul>

<h2>Tips for Success</h2>
<ul>
${welcomePacket.first_30_days_tips.map(tip => `<li>${tip}</li>`).join('\n')}
</ul>

<h2>Meet Your Team</h2>
${welcomePacket.team_introductions.map(member => `
<div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
  <strong>${member.name}</strong> - ${member.role}<br/>
  ${member.bio}
</div>
`).join('\n')}

<h2>Important Contacts</h2>
<ul>
${welcomePacket.important_contacts.map(c => `<li><strong>${c.title}:</strong> ${c.contact}</li>`).join('\n')}
</ul>

<h2>Frequently Asked Questions</h2>
${welcomePacket.faqs.map(faq => `
<div style="margin: 10px 0;">
  <strong>Q: ${faq.question}</strong><br/>
  <p>${faq.answer}</p>
</div>
`).join('\n')}

<hr/>
<p>${welcomePacket.closing_message}</p>
      `;

      await base44.integrations.Core.SendEmail({
        to: staffMember.email,
        subject: `Welcome to ${orgProfile?.organisation_name || 'Our Team'}, ${staffMember.full_name}!`,
        body: emailBody
      });
    },
    onSuccess: () => {
      toast.success("Email Sent", "Welcome packet sent to employee");
    },
    onError: (error) => {
      toast.error("Send Failed", error.message);
    }
  });

  const downloadPacket = () => {
    const packetText = `
WELCOME PACKET
${orgProfile?.organisation_name || 'Our Organization'}
Prepared for: ${staffMember.full_name}
Generated: ${new Date().toLocaleDateString()}

${welcomePacket.welcome_message}

=== ABOUT OUR ORGANIZATION ===
${welcomePacket.organization_overview}

=== MISSION & VALUES ===
${welcomePacket.mission_and_values}

=== MEET YOUR TEAM ===
${welcomePacket.team_introductions.map(m => `
${m.name} - ${m.role}
${m.bio}
`).join('\n')}

=== YOUR FIRST WEEK TASKS ===
${welcomePacket.first_week_tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

=== TIPS FOR SUCCESS (FIRST 30 DAYS) ===
${welcomePacket.first_30_days_tips.map((t, i) => `${i + 1}. ${t}`).join('\n')}

=== IMPORTANT CONTACTS ===
${welcomePacket.important_contacts.map(c => `${c.title}: ${c.contact}`).join('\n')}

=== FREQUENTLY ASKED QUESTIONS ===
${welcomePacket.faqs.map(faq => `
Q: ${faq.question}
A: ${faq.answer}
`).join('\n')}

${welcomePacket.closing_message}
    `;

    const blob = new Blob([packetText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `welcome-packet-${staffMember.full_name.replace(/\s+/g, '-')}.txt`;
    a.click();
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <FileText className="w-5 h-5" />
          AI Welcome Packet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!welcomePacket ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Generate a personalized welcome packet with company info, team introductions, and first-week tasks for {staffMember.full_name}.
            </p>
            <Button
              onClick={() => generatePacketMutation.mutate()}
              disabled={generatePacketMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {generatePacketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Welcome Packet...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Welcome Packet
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Welcome Message</h4>
                <p className="text-sm text-gray-700">{welcomePacket.welcome_message}</p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Organization Overview</h4>
                <p className="text-sm text-gray-700">{welcomePacket.organization_overview}</p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">First Week Tasks</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {welcomePacket.first_week_tasks.map((task, i) => (
                    <li key={i}>{task}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Team Introductions ({welcomePacket.team_introductions.length})</h4>
                <div className="space-y-2">
                  {welcomePacket.team_introductions.slice(0, 3).map((member, i) => (
                    <div key={i} className="text-sm bg-white p-2 rounded">
                      <p className="font-medium text-gray-900">{member.name} - {member.role}</p>
                      <p className="text-gray-600 text-xs">{member.bio}</p>
                    </div>
                  ))}
                  {welcomePacket.team_introductions.length > 3 && (
                    <p className="text-xs text-gray-500">+ {welcomePacket.team_introductions.length - 3} more team members</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Tips for Success</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {welcomePacket.first_30_days_tips.slice(0, 5).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => sendEmailMutation.mutate()}
                disabled={sendEmailMutation.isPending || !staffMember.email}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Email to Employee
                  </>
                )}
              </Button>
              <Button
                onClick={downloadPacket}
                variant="outline"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={() => {
                setWelcomePacket(null);
                generatePacketMutation.reset();
              }}
              variant="outline"
              className="w-full"
            >
              Generate New Packet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}