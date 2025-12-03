import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Database, 
  Layout, 
  Component, 
  Server,
  Shield,
  Users,
  Calendar,
  ClipboardList,
  Home,
  Activity,
  MessageSquare,
  FileCheck,
  Loader2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

// Entity Definitions with full schema documentation
const ENTITY_DEFINITIONS = {
  // Core Entities
  Client: {
    category: "Core",
    description: "Stores client/service user information including personal details, care needs, and contact information",
    fields: [
      { name: "full_name", type: "string", required: true, description: "Full name of the client" },
      { name: "date_of_birth", type: "date", required: false, description: "Date of birth" },
      { name: "address", type: "object", required: false, description: "Address with street, city, postcode, lat/lng" },
      { name: "phone", type: "string", required: false, description: "Phone number" },
      { name: "emergency_contact", type: "object", required: false, description: "Emergency contact details (name, phone, relationship)" },
      { name: "care_needs", type: "array", required: false, description: "List of care needs" },
      { name: "preferred_carers", type: "array", required: false, description: "IDs of preferred carers for continuity" },
      { name: "medical_notes", type: "string", required: false, description: "Important medical information" },
      { name: "mobility", type: "enum", required: false, description: "independent | requires_assistance | wheelchair_user | bed_bound" },
      { name: "status", type: "enum", required: false, description: "active | inactive | archived" },
      { name: "funding_type", type: "enum", required: false, description: "local_authority | self_funded | nhs | mixed" },
    ]
  },
  Carer: {
    category: "Core",
    description: "Staff member records for carers including qualifications, rates, and contact details",
    fields: [
      { name: "full_name", type: "string", required: true, description: "Full name of the carer" },
      { name: "email", type: "email", required: true, description: "Email address" },
      { name: "phone", type: "string", required: true, description: "Phone number" },
      { name: "qualifications", type: "array", required: false, description: "List of qualification IDs" },
      { name: "status", type: "enum", required: false, description: "active | inactive | on_leave" },
      { name: "employment_type", type: "enum", required: false, description: "full_time | part_time | contract | bank" },
      { name: "hourly_rate", type: "number", required: false, description: "Hourly rate for the carer" },
      { name: "address", type: "object", required: false, description: "Address with coordinates" },
      { name: "emergency_contact", type: "object", required: false, description: "Emergency contact details" },
      { name: "dbscertificate_number", type: "string", required: false, description: "DBS certificate number" },
      { name: "dbs_expiry", type: "date", required: false, description: "DBS expiry date" },
      { name: "attached_documents", type: "array", required: false, description: "Documents attached to carer file" },
    ]
  },
  Staff: {
    category: "Core",
    description: "General staff members (non-carer roles) with qualifications and preferences",
    fields: [
      { name: "full_name", type: "string", required: true, description: "Full name of staff member" },
      { name: "email", type: "email", required: true, description: "Email address" },
      { name: "phone", type: "string", required: true, description: "Phone number" },
      { name: "qualifications", type: "array", required: false, description: "List of qualification IDs" },
      { name: "is_active", type: "boolean", required: false, description: "Whether staff member is active" },
      { name: "preferred_areas", type: "array", required: false, description: "Preferred postcodes or areas" },
      { name: "max_visits_per_day", type: "number", required: false, description: "Maximum visits per day (default: 8)" },
      { name: "vehicle_type", type: "enum", required: false, description: "car | bike | public_transport | walking" },
      { name: "hourly_rate", type: "number", required: false, description: "Hourly rate for payroll" },
    ]
  },

  // Scheduling Entities
  Shift: {
    category: "Scheduling",
    description: "Shift records for residential care, supported living, and day centre scheduling",
    fields: [
      { name: "care_type", type: "enum", required: false, description: "residential_care | domiciliary_care | supported_living | day_centre" },
      { name: "assignment_type", type: "enum", required: false, description: "client | property | location" },
      { name: "client_id", type: "string", required: false, description: "ID of the client (for client-based shifts)" },
      { name: "property_id", type: "string", required: false, description: "ID of the property (for supported living)" },
      { name: "location_name", type: "string", required: false, description: "Name of location" },
      { name: "carer_id", type: "string", required: false, description: "ID of assigned carer" },
      { name: "date", type: "date", required: true, description: "Date of the shift" },
      { name: "start_time", type: "string", required: true, description: "Start time (HH:MM format)" },
      { name: "end_time", type: "string", required: true, description: "End time (HH:MM format)" },
      { name: "shift_type", type: "enum", required: false, description: "morning | afternoon | evening | night | sleep_in | waking_night" },
      { name: "status", type: "enum", required: false, description: "draft | published | scheduled | in_progress | completed | cancelled | unfilled" },
      { name: "tasks", type: "array", required: false, description: "Tasks to be performed" },
      { name: "attached_documents", type: "array", required: false, description: "Documents attached to shift" },
      { name: "assessment_documents", type: "array", required: false, description: "Assessment documents for care plan generation" },
    ]
  },
  Visit: {
    category: "Scheduling",
    description: "Domiciliary care visit records with scheduling and completion tracking",
    fields: [
      { name: "client_id", type: "string", required: true, description: "ID of the client being visited" },
      { name: "assigned_staff_id", type: "string", required: false, description: "ID of assigned staff member" },
      { name: "run_id", type: "string", required: false, description: "ID of the parent run" },
      { name: "scheduled_start", type: "datetime", required: true, description: "Scheduled start time" },
      { name: "scheduled_end", type: "datetime", required: true, description: "Scheduled end time" },
      { name: "actual_start", type: "datetime", required: false, description: "Actual clock-in time" },
      { name: "actual_end", type: "datetime", required: false, description: "Actual clock-out time" },
      { name: "status", type: "enum", required: false, description: "draft | published | in_progress | completed | cancelled | missed" },
      { name: "visit_type", type: "enum", required: false, description: "regular | assessment | pre_admission | care_assessment | review | initial" },
      { name: "tasks", type: "array", required: false, description: "Tasks to complete during visit" },
      { name: "assessment_documents", type: "array", required: false, description: "Assessment documents attached" },
    ]
  },
  Run: {
    category: "Scheduling",
    description: "Groups of visits assigned to a carer for efficient routing in domiciliary care",
    fields: [
      { name: "run_name", type: "string", required: true, description: "Name of the run" },
      { name: "assigned_staff_id", type: "string", required: false, description: "Assigned staff member" },
      { name: "date", type: "date", required: true, description: "Date of the run" },
      { name: "start_time", type: "string", required: false, description: "Run start time" },
      { name: "status", type: "enum", required: false, description: "draft | published | in_progress | completed" },
    ]
  },
  CarerAvailability: {
    category: "Scheduling",
    description: "Carer availability patterns including working hours and unavailability periods",
    fields: [
      { name: "carer_id", type: "string", required: true, description: "ID of the carer" },
      { name: "availability_type", type: "enum", required: true, description: "working_hours | day_off | unavailable | preferred" },
      { name: "day_of_week", type: "number", required: false, description: "Day of week (0=Sunday, 6=Saturday)" },
      { name: "start_time", type: "string", required: false, description: "Start time (HH:MM)" },
      { name: "end_time", type: "string", required: false, description: "End time (HH:MM)" },
      { name: "specific_date", type: "date", required: false, description: "Specific date for one-off" },
      { name: "is_recurring", type: "boolean", required: false, description: "Whether recurring pattern" },
    ]
  },
  LeaveRequest: {
    category: "Scheduling",
    description: "Staff leave/holiday requests with approval workflow",
    fields: [
      { name: "staff_id", type: "string", required: true, description: "Staff member requesting leave" },
      { name: "leave_type", type: "enum", required: true, description: "annual | sick | unpaid | compassionate | training" },
      { name: "start_date", type: "date", required: true, description: "Start date of leave" },
      { name: "end_date", type: "date", required: true, description: "End date of leave" },
      { name: "status", type: "enum", required: false, description: "pending | approved | rejected | cancelled" },
      { name: "reason", type: "string", required: false, description: "Reason for leave" },
    ]
  },

  // Care Management Entities
  CarePlan: {
    category: "Care Management",
    description: "Comprehensive care plans including objectives, tasks, medication, and risk factors",
    fields: [
      { name: "client_id", type: "string", required: true, description: "ID of the client" },
      { name: "care_setting", type: "enum", required: true, description: "residential | domiciliary | supported_living | day_centre" },
      { name: "plan_type", type: "enum", required: false, description: "initial | review | interim | discharge" },
      { name: "assessment_date", type: "date", required: true, description: "Date of assessment" },
      { name: "review_date", type: "date", required: false, description: "Next review date" },
      { name: "assessed_by", type: "string", required: true, description: "Staff member who completed assessment" },
      { name: "care_objectives", type: "array", required: false, description: "Care objectives with status tracking" },
      { name: "care_tasks", type: "array", required: false, description: "Specific care tasks/interventions" },
      { name: "medication_management", type: "object", required: false, description: "Medication details and protocols" },
      { name: "risk_factors", type: "array", required: false, description: "Identified risks with control measures" },
      { name: "status", type: "enum", required: false, description: "draft | active | under_review | archived" },
    ]
  },
  MedicationLog: {
    category: "Care Management",
    description: "Medication administration records (MAR)",
    fields: [
      { name: "client_id", type: "string", required: true, description: "Client receiving medication" },
      { name: "medication_name", type: "string", required: true, description: "Name of medication" },
      { name: "dose", type: "string", required: true, description: "Dosage administered" },
      { name: "administration_time", type: "datetime", required: true, description: "Time of administration" },
      { name: "administered_by", type: "string", required: true, description: "Staff member who administered" },
      { name: "status", type: "enum", required: false, description: "administered | refused | not_required | missed" },
    ]
  },
  IncidentReport: {
    category: "Care Management",
    description: "Incident and accident reports with investigation workflow",
    fields: [
      { name: "incident_date", type: "datetime", required: true, description: "Date and time of incident" },
      { name: "incident_type", type: "enum", required: true, description: "fall | medication_error | injury | behavioural | safeguarding | other" },
      { name: "client_id", type: "string", required: false, description: "Client involved" },
      { name: "staff_id", type: "string", required: false, description: "Staff involved" },
      { name: "description", type: "string", required: true, description: "Description of incident" },
      { name: "severity", type: "enum", required: false, description: "minor | moderate | serious | critical" },
      { name: "status", type: "enum", required: false, description: "reported | investigating | resolved | closed" },
      { name: "actions_taken", type: "string", required: false, description: "Immediate actions taken" },
    ]
  },
  DailyLog: {
    category: "Care Management",
    description: "Daily log entries for visitors, appointments, and outings",
    fields: [
      { name: "log_date", type: "date", required: true, description: "Date of the log entry" },
      { name: "entry_type", type: "enum", required: true, description: "visitor | doctor_appointment | outing_activity | etc." },
      { name: "client_id", type: "string", required: false, description: "Related client" },
      { name: "visitor_name", type: "string", required: false, description: "Name of visitor" },
      { name: "arrival_time", type: "string", required: false, description: "Time of arrival" },
      { name: "departure_time", type: "string", required: false, description: "Time of departure" },
      { name: "purpose", type: "string", required: false, description: "Purpose of visit/outing" },
      { name: "notes", type: "string", required: false, description: "Additional notes" },
    ]
  },
  ClientProgressRecord: {
    category: "Care Management",
    description: "Progress tracking for clients across multiple areas with trend analysis",
    fields: [
      { name: "client_id", type: "string", required: true, description: "Related client" },
      { name: "record_date", type: "date", required: true, description: "Date of progress record" },
      { name: "record_type", type: "enum", required: false, description: "weekly | monthly | quarterly | ad_hoc" },
      { name: "behaviour", type: "object", required: false, description: "Behaviour ratings, trends, and notes" },
      { name: "education_schooling", type: "object", required: false, description: "Education progress, attendance, academic performance" },
      { name: "social_emotional", type: "object", required: false, description: "Social skills, emotional regulation, relationships" },
      { name: "health_wellbeing", type: "object", required: false, description: "Physical and mental health tracking" },
      { name: "independence_skills", type: "object", required: false, description: "Life skills and independence development" },
      { name: "activities_engagement", type: "object", required: false, description: "Activities and community involvement" },
      { name: "key_achievements", type: "array", required: false, description: "Notable achievements this period" },
      { name: "concerns", type: "array", required: false, description: "Areas of concern" },
      { name: "overall_progress", type: "enum", required: false, description: "significant_improvement | improvement | stable | slight_decline | significant_decline" },
      { name: "overall_rating", type: "number", required: false, description: "Overall rating 1-10" },
    ]
  },

  // Staff Management Entities
  StaffSupervision: {
    category: "Staff Management",
    description: "Staff supervision records with discussion topics and targets",
    fields: [
      { name: "staff_id", type: "string", required: true, description: "ID of staff member" },
      { name: "supervisor_id", type: "string", required: true, description: "ID of supervisor" },
      { name: "supervision_date", type: "date", required: true, description: "Date of supervision" },
      { name: "supervision_type", type: "enum", required: true, description: "formal_one_to_one | informal | group | probation_review | spot_check" },
      { name: "discussion_topics", type: "object", required: false, description: "Topics discussed with notes" },
      { name: "new_targets", type: "array", required: false, description: "Targets set for staff member" },
      { name: "overall_performance_rating", type: "enum", required: false, description: "exceeds_expectations | meets_expectations | requires_improvement | unsatisfactory" },
    ]
  },
  StaffTask: {
    category: "Staff Management",
    description: "Tasks assigned to staff including supervisions, audits, and form completions",
    fields: [
      { name: "title", type: "string", required: true, description: "Task title" },
      { name: "task_type", type: "enum", required: true, description: "supervision | assessment | audit | training | spot_check | review | general" },
      { name: "assigned_to_staff_id", type: "string", required: true, description: "Staff member assigned" },
      { name: "form_template_id", type: "string", required: false, description: "Form template to complete" },
      { name: "priority", type: "enum", required: false, description: "low | medium | high | urgent" },
      { name: "status", type: "enum", required: false, description: "pending | in_progress | completed | cancelled" },
      { name: "due_date", type: "date", required: false, description: "Due date" },
    ]
  },
  TrainingModule: {
    category: "Staff Management",
    description: "Training modules and courses available for staff",
    fields: [
      { name: "module_name", type: "string", required: true, description: "Name of training module" },
      { name: "description", type: "string", required: false, description: "Module description" },
      { name: "category", type: "enum", required: false, description: "mandatory | recommended | optional" },
      { name: "duration_hours", type: "number", required: false, description: "Duration in hours" },
      { name: "validity_months", type: "number", required: false, description: "Validity period in months" },
    ]
  },
  TrainingAssignment: {
    category: "Staff Management",
    description: "Training assignments linking staff to training modules",
    fields: [
      { name: "staff_id", type: "string", required: true, description: "Staff member" },
      { name: "module_id", type: "string", required: true, description: "Training module" },
      { name: "assigned_date", type: "date", required: true, description: "Date assigned" },
      { name: "due_date", type: "date", required: false, description: "Completion due date" },
      { name: "completed_date", type: "date", required: false, description: "Completion date" },
      { name: "status", type: "enum", required: false, description: "assigned | in_progress | completed | overdue" },
    ]
  },

  // Payroll Entities
  TimesheetEntry: {
    category: "Payroll",
    description: "Timesheet entries for payroll processing",
    fields: [
      { name: "staff_id", type: "string", required: true, description: "Staff member" },
      { name: "shift_id", type: "string", required: false, description: "Related shift" },
      { name: "timesheet_date", type: "date", required: true, description: "Date of timesheet" },
      { name: "planned_clock_in", type: "string", required: false, description: "Scheduled start" },
      { name: "actual_clock_in", type: "string", required: false, description: "Actual clock in" },
      { name: "actual_clock_out", type: "string", required: false, description: "Actual clock out" },
      { name: "actual_hours", type: "number", required: false, description: "Hours worked" },
      { name: "pay_bucket", type: "enum", required: false, description: "standard | overtime | weekend | bank_holiday | night | sleep_in" },
      { name: "status", type: "enum", required: false, description: "pending | matched | approved | paid" },
    ]
  },
  PayrollPeriod: {
    category: "Payroll",
    description: "Payroll periods for processing pay runs",
    fields: [
      { name: "period_name", type: "string", required: true, description: "Period name (e.g., Week 17)" },
      { name: "period_type", type: "enum", required: false, description: "weekly | bi_weekly | monthly | four_weekly" },
      { name: "start_date", type: "date", required: true, description: "Period start" },
      { name: "end_date", type: "date", required: true, description: "Period end" },
      { name: "pay_date", type: "date", required: true, description: "Pay date" },
      { name: "status", type: "enum", required: false, description: "draft | pending_approval | approved | processed | paid" },
      { name: "total_gross_pay", type: "number", required: false, description: "Total gross pay" },
    ]
  },
  ClientInvoice: {
    category: "Payroll",
    description: "Client invoices with split billing support",
    fields: [
      { name: "invoice_number", type: "string", required: false, description: "Invoice reference" },
      { name: "client_id", type: "string", required: true, description: "Client" },
      { name: "invoice_date", type: "date", required: true, description: "Invoice date" },
      { name: "period_start", type: "date", required: true, description: "Period start" },
      { name: "period_end", type: "date", required: true, description: "Period end" },
      { name: "line_items", type: "array", required: false, description: "Invoice line items" },
      { name: "split_billing", type: "array", required: false, description: "Split billing configuration" },
      { name: "total_amount", type: "number", required: false, description: "Total amount" },
      { name: "status", type: "enum", required: false, description: "draft | sent | partially_paid | paid | overdue | cancelled" },
    ]
  },

  // Forms & Compliance Entities
  FormTemplate: {
    category: "Forms & Compliance",
    description: "Dynamic form templates with sections, fields, and workflow triggers",
    fields: [
      { name: "form_name", type: "string", required: true, description: "Name of form template" },
      { name: "category", type: "enum", required: false, description: "care_plan | assessment | incident | consent | medication | daily_log | audit | training | other" },
      { name: "sections", type: "array", required: true, description: "Form sections with fields" },
      { name: "workflow_triggers", type: "array", required: false, description: "Automated workflow triggers" },
      { name: "is_active", type: "boolean", required: false, description: "Whether template is active" },
    ]
  },
  FormSubmission: {
    category: "Forms & Compliance",
    description: "Submitted form data linked to templates",
    fields: [
      { name: "form_template_id", type: "string", required: true, description: "Form template ID" },
      { name: "form_name", type: "string", required: true, description: "Form name" },
      { name: "submitted_date", type: "datetime", required: false, description: "Submission date" },
      { name: "client_id", type: "string", required: false, description: "Related client" },
      { name: "staff_id", type: "string", required: false, description: "Related staff" },
      { name: "form_data", type: "object", required: false, description: "Submitted form data" },
      { name: "status", type: "enum", required: false, description: "draft | submitted | approved | rejected" },
    ]
  },
  ComplianceTask: {
    category: "Forms & Compliance",
    description: "Compliance tasks with due dates and assignments",
    fields: [
      { name: "title", type: "string", required: true, description: "Task title" },
      { name: "category", type: "enum", required: true, description: "cqc | health_safety | safeguarding | training | audit | other" },
      { name: "assigned_to", type: "string", required: false, description: "Assigned staff" },
      { name: "due_date", type: "date", required: true, description: "Due date" },
      { name: "status", type: "enum", required: false, description: "pending | in_progress | completed | overdue" },
      { name: "priority", type: "enum", required: false, description: "low | medium | high | critical" },
    ]
  },

  // Communication Entities
  CRMFollowUp: {
    category: "Communication",
    description: "Follow-up tracking for internal tasks and external requests with automated reminders and escalation alerts",
    fields: [
      { name: "follow_up_type", type: "enum", required: true, description: "document_chase | report_request | information_request | internal_task | phone_call | email | meeting | assessment" },
      { name: "recipient_type", type: "enum", required: false, description: "internal | external" },
      { name: "title", type: "string", required: true, description: "Follow-up title" },
      { name: "description", type: "string", required: false, description: "Details of follow-up needed" },
      { name: "created_by_email", type: "string", required: false, description: "Email of staff who created this" },
      { name: "assigned_to", type: "string", required: false, description: "Staff member ID (for internal)" },
      { name: "assigned_to_email", type: "string", required: false, description: "Email of assigned staff" },
      { name: "external_contact_name", type: "string", required: false, description: "External contact name" },
      { name: "external_contact_email", type: "string", required: false, description: "External contact email" },
      { name: "external_contact_role", type: "enum", required: false, description: "social_worker | gp | nurse | therapist | family_member | local_authority | nhs | other" },
      { name: "due_date", type: "datetime", required: true, description: "When response is due" },
      { name: "reminder_days_before", type: "number", required: false, description: "Days before due date to send reminder" },
      { name: "escalation_after_days", type: "number", required: false, description: "Days after due date to escalate" },
      { name: "reminder_sent", type: "boolean", required: false, description: "Whether reminder sent" },
      { name: "overdue_alert_sent", type: "boolean", required: false, description: "Whether overdue alert sent" },
      { name: "escalation_sent", type: "boolean", required: false, description: "Whether escalation sent" },
      { name: "status", type: "enum", required: false, description: "pending | in_progress | awaiting_response | completed | cancelled | overdue" },
      { name: "outcome", type: "string", required: false, description: "Result of follow-up" },
    ]
  },
  CallTranscript: {
    category: "Communication",
    description: "Call recordings with AI transcription and analysis",
    fields: [
      { name: "call_date", type: "datetime", required: true, description: "Date and time of call" },
      { name: "caller_name", type: "string", required: false, description: "Name of caller" },
      { name: "caller_relationship", type: "enum", required: false, description: "client | family_member | healthcare_professional | etc." },
      { name: "related_client_id", type: "string", required: false, description: "Related client" },
      { name: "audio_file_url", type: "string", required: false, description: "URL of audio file" },
      { name: "transcript", type: "string", required: false, description: "Full transcript" },
      { name: "summary", type: "string", required: false, description: "AI-generated summary" },
      { name: "key_decisions", type: "array", required: false, description: "Key decisions made" },
      { name: "follow_up_points", type: "array", required: false, description: "Follow-up actions" },
      { name: "sentiment", type: "enum", required: false, description: "positive | neutral | concerned | urgent | complaint" },
    ]
  },
  ClientFeedback: {
    category: "Communication",
    description: "Client and family feedback with response tracking",
    fields: [
      { name: "client_id", type: "string", required: false, description: "Related client" },
      { name: "feedback_type", type: "enum", required: true, description: "compliment | complaint | suggestion | concern | general" },
      { name: "category", type: "enum", required: false, description: "staff_performance | care_quality | communication | etc." },
      { name: "rating", type: "number", required: false, description: "Rating 1-5" },
      { name: "comments", type: "string", required: true, description: "Feedback comments" },
      { name: "status", type: "enum", required: false, description: "new | acknowledged | in_progress | resolved | closed" },
      { name: "response", type: "string", required: false, description: "Staff response" },
    ]
  },
  Notification: {
    category: "Communication",
    description: "System notifications for users",
    fields: [
      { name: "user_email", type: "string", required: true, description: "Recipient email" },
      { name: "title", type: "string", required: true, description: "Notification title" },
      { name: "message", type: "string", required: true, description: "Notification message" },
      { name: "type", type: "enum", required: false, description: "info | warning | error | success" },
      { name: "is_read", type: "boolean", required: false, description: "Read status" },
      { name: "link", type: "string", required: false, description: "Link to related item" },
    ]
  },

  // Reporting
  ScheduledReport: {
    category: "Reporting",
    description: "Scheduled report configurations with frequency, recipients, and parameters",
    fields: [
      { name: "report_name", type: "string", required: true, description: "Name of the scheduled report" },
      { name: "report_type", type: "enum", required: true, description: "client_progress | staff_performance | compliance | payroll_summary | incident_trends | training_compliance | audit_summary | medication_compliance" },
      { name: "parameters", type: "object", required: false, description: "Report parameters (date range, filters)" },
      { name: "schedule_frequency", type: "enum", required: true, description: "daily | weekly | fortnightly | monthly | quarterly | annually" },
      { name: "schedule_day", type: "number", required: false, description: "Day of week (0-6) or day of month (1-31)" },
      { name: "schedule_time", type: "string", required: false, description: "Time to run (HH:MM)" },
      { name: "next_run_date", type: "datetime", required: false, description: "Next scheduled run" },
      { name: "recipients", type: "array", required: false, description: "Email addresses to send report to" },
      { name: "output_format", type: "enum", required: false, description: "pdf | csv | excel | email_summary" },
      { name: "is_active", type: "boolean", required: false, description: "Whether schedule is active" },
    ]
  },
  GeneratedReport: {
    category: "Reporting",
    description: "Generated report records with data and file attachments",
    fields: [
      { name: "scheduled_report_id", type: "string", required: false, description: "ID of scheduled report if applicable" },
      { name: "report_name", type: "string", required: true, description: "Name of the report" },
      { name: "report_type", type: "enum", required: true, description: "Type of report generated" },
      { name: "generated_date", type: "datetime", required: false, description: "When report was generated" },
      { name: "generated_by", type: "string", required: false, description: "User who generated or 'system'" },
      { name: "parameters_used", type: "object", required: false, description: "Parameters used to generate" },
      { name: "report_data", type: "object", required: false, description: "The actual report data/summary" },
      { name: "file_url", type: "string", required: false, description: "URL to downloadable file" },
      { name: "status", type: "enum", required: false, description: "generating | completed | failed" },
      { name: "sent_to", type: "array", required: false, description: "Recipients report was sent to" },
    ]
  },

  // Supported Living & Day Centre
  SupportedLivingProperty: {
    category: "Supported Living",
    description: "Properties/houses for supported living services",
    fields: [
      { name: "property_name", type: "string", required: true, description: "Name of property" },
      { name: "address", type: "object", required: true, description: "Full address" },
      { name: "capacity", type: "number", required: false, description: "Number of residents" },
      { name: "property_type", type: "enum", required: false, description: "house | flat | bungalow | other" },
      { name: "status", type: "enum", required: false, description: "active | inactive" },
    ]
  },
  DayCentreSession: {
    category: "Day Centre",
    description: "Day centre sessions with activities and attendance",
    fields: [
      { name: "session_name", type: "string", required: true, description: "Name of session" },
      { name: "session_date", type: "date", required: true, description: "Date of session" },
      { name: "start_time", type: "string", required: true, description: "Start time" },
      { name: "end_time", type: "string", required: true, description: "End time" },
      { name: "activities", type: "array", required: false, description: "Planned activities" },
      { name: "capacity", type: "number", required: false, description: "Maximum capacity" },
      { name: "status", type: "enum", required: false, description: "scheduled | in_progress | completed | cancelled" },
    ]
  },
  DayCentreAttendance: {
    category: "Day Centre",
    description: "Client attendance records for day centre sessions",
    fields: [
      { name: "session_id", type: "string", required: true, description: "Session ID" },
      { name: "client_id", type: "string", required: true, description: "Client ID" },
      { name: "arrival_time", type: "string", required: false, description: "Arrival time" },
      { name: "departure_time", type: "string", required: false, description: "Departure time" },
      { name: "attendance_status", type: "enum", required: false, description: "attending | absent | cancelled" },
      { name: "transport_required", type: "boolean", required: false, description: "Transport needed" },
    ]
  },
};

// Page Definitions
const PAGE_DEFINITIONS = {
  "Residential Care": [
    { name: "Dashboard", description: "Main dashboard with stats, alerts, and quick actions", path: "/Dashboard" },
    { name: "ManagerDashboard", description: "Manager-specific dashboard with analytics", path: "/ManagerDashboard" },
    { name: "Schedule", description: "Shift scheduling with roster, day, week, month views", path: "/Schedule" },
    { name: "CarerAvailability", description: "Manage carer availability and working hours", path: "/CarerAvailability" },
    { name: "Carers", description: "Carer management with profiles and documents", path: "/Carers" },
    { name: "Clients", description: "Client management with care plans and documents", path: "/Clients" },
    { name: "CareDocuments", description: "Document library with care forms and templates", path: "/CareDocuments" },
    { name: "SupervisionManagement", description: "Staff supervisions and performance tracking", path: "/SupervisionManagement" },
    { name: "IncidentManagement", description: "Incident reporting and investigation", path: "/IncidentManagement" },
    { name: "PayrollDashboard", description: "Payroll processing and timesheet management", path: "/PayrollDashboard" },
    { name: "Reports", description: "Reporting and analytics", path: "/Reports" },
    { name: "Notifications", description: "System notifications", path: "/Notifications" },
    { name: "LeaveRequests", description: "Staff leave request management", path: "/LeaveRequests" },
    { name: "DailyLog", description: "Daily log for visitors and outings", path: "/DailyLog" },
    { name: "MessagingCenter", description: "Internal messaging system", path: "/MessagingCenter" },
    { name: "StaffTasks", description: "Task management for staff", path: "/StaffTasks" },
  ],
  "Domiciliary Care": [
    { name: "DomCareDashboard", description: "Domiciliary care overview dashboard", path: "/DomCareDashboard" },
    { name: "DomCareSchedule", description: "Visit scheduling with roster and timeline views", path: "/DomCareSchedule" },
    { name: "DomCareStaff", description: "Domiciliary care staff management", path: "/DomCareStaff" },
    { name: "DomCareClients", description: "Dom care client management", path: "/DomCareClients" },
    { name: "DomCareRuns", description: "Run planning and management", path: "/DomCareRuns" },
    { name: "CommunicationHub", description: "Communication center for dom care", path: "/CommunicationHub" },
    { name: "ClientFeedback", description: "Client feedback and complaints", path: "/ClientFeedback" },
    { name: "StaffTraining", description: "Training management", path: "/StaffTraining" },
    { name: "DomCareReports", description: "Dom care specific reports", path: "/DomCareReports" },
  ],
  "Supported Living": [
    { name: "SupportedLivingDashboard", description: "Supported living overview", path: "/SupportedLivingDashboard" },
    { name: "SupportedLivingClients", description: "Supported living client management", path: "/SupportedLivingClients" },
    { name: "SupportedLivingProperties", description: "Property management", path: "/SupportedLivingProperties" },
    { name: "SupportedLivingSchedule", description: "Shift scheduling for properties", path: "/SupportedLivingSchedule" },
  ],
  "Day Centre": [
    { name: "DayCentreDashboard", description: "Day centre overview", path: "/DayCentreDashboard" },
    { name: "DayCentreClients", description: "Day centre client management", path: "/DayCentreClients" },
    { name: "DayCentreActivities", description: "Activity planning", path: "/DayCentreActivities" },
    { name: "DayCentreSessions", description: "Session management", path: "/DayCentreSessions" },
    { name: "DayCentreAttendance", description: "Attendance tracking", path: "/DayCentreAttendance" },
    { name: "CallTranscripts", description: "Call recording and transcription", path: "/CallTranscripts" },
  ],
  "Compliance & Quality": [
    { name: "ComplianceHub", description: "Compliance overview and CQC tracking", path: "/ComplianceHub" },
    { name: "ComplianceTaskCenter", description: "Compliance task management", path: "/ComplianceTaskCenter" },
    { name: "ActionPlanProgress", description: "Action plan tracking", path: "/ActionPlanProgress" },
    { name: "ReportingEngine", description: "Automated reporting engine with scheduling, customization, and multiple report types", path: "/ReportingEngine" },
    { name: "AuditTemplates", description: "Audit template management", path: "/AuditTemplates" },
    { name: "FormBuilder", description: "Dynamic form builder", path: "/FormBuilder" },
  ],
  "CRM & Intake": [
    { name: "CRMDashboard", description: "CRM and enquiry management", path: "/CRMDashboard" },
    { name: "ClientCommunicationHub", description: "Client communication tracking", path: "/ClientCommunicationHub" },
  ],
  "Staff Access": [
    { name: "StaffPortal", description: "Mobile-first staff portal for carers", path: "/StaffPortal" },
  ],
  "Client Portal": [
    { name: "ClientPortal", description: "Client/family portal home", path: "/ClientPortal" },
    { name: "ClientPortalSchedule", description: "View scheduled visits", path: "/ClientPortalSchedule" },
    { name: "ClientPortalMessages", description: "Message care team", path: "/ClientPortalMessages" },
    { name: "ClientPortalBookings", description: "Request additional bookings", path: "/ClientPortalBookings" },
  ],
  "System": [
    { name: "RoleManagement", description: "User role and permission management", path: "/RoleManagement" },
    { name: "ModuleSettings", description: "Enable/disable care modules", path: "/ModuleSettings" },
    { name: "UserManagement", description: "User account management", path: "/UserManagement" },
  ],
};

// AI Features
const AI_FEATURES = [
  {
    name: "AI Care Plan Generator",
    component: "AICarePlanGenerator",
    description: "Generates comprehensive care plans from assessment documents using AI. Supports tone customization (professional, person-centered, family-friendly, technical) and condition templates (dementia, mobility, diabetes, stroke, palliative, mental health, learning disability, elderly/frail).",
    capabilities: ["Document analysis", "Care objective generation", "Task creation", "Risk identification", "Medication extraction"]
  },
  {
    name: "AI Schedule Generator",
    component: "AIScheduleGenerator",
    description: "Intelligently generates weekly schedules based on client needs, staff qualifications, availability, and preferences.",
    capabilities: ["Automatic shift assignment", "Qualification matching", "Travel optimization", "Conflict detection"]
  },
  {
    name: "AI Smart Allocator",
    component: "AIShiftAllocator",
    description: "Suggests optimal carer assignments for unfilled shifts based on multiple factors.",
    capabilities: ["Qualification matching", "Availability checking", "Distance calculation", "Client preference matching"]
  },
  {
    name: "AI Incident Analyzer",
    component: "AIIncidentAnalyzer",
    description: "Analyzes incident patterns and generates insights for prevention.",
    capabilities: ["Pattern recognition", "Root cause analysis", "Prevention recommendations", "Trend identification"]
  },
  {
    name: "AI Call Transcription",
    component: "CallTranscriptionUploader",
    description: "Transcribes phone calls and extracts key information, decisions, and follow-up actions.",
    capabilities: ["Speech-to-text", "Speaker identification", "Summary generation", "Action item extraction", "Sentiment analysis"]
  },
  {
    name: "AI Form Generator",
    component: "AIFormGenerator",
    description: "Generates form templates based on natural language descriptions.",
    capabilities: ["Form structure generation", "Field type detection", "Validation rules", "Workflow triggers"]
  },
  {
    name: "AI Audit Analyzer",
    component: "AIAuditAnalyzer",
    description: "Analyzes audit results and generates improvement recommendations.",
    capabilities: ["Gap analysis", "Compliance scoring", "Action plan generation", "Trend analysis"]
  },
  {
    name: "AI Training Analyzer",
    component: "AITrainingAnalyzer",
    description: "Analyzes training compliance and identifies gaps.",
    capabilities: ["Compliance tracking", "Gap identification", "Training recommendations", "Expiry predictions"]
  },
  {
    name: "AI Notes Assistant",
    component: "AINotesAssistant",
    description: "Helps staff write professional care notes with grammar checking.",
    capabilities: ["Grammar correction", "Professional language", "Terminology suggestions", "Structure improvement"]
  },
  {
    name: "AI Document Importer",
    component: "AIDocumentImporter",
    description: "Extracts client data from uploaded documents.",
    capabilities: ["PDF extraction", "Data mapping", "Field detection", "Bulk import"]
  },
];

// Key Components
const KEY_COMPONENTS = [
  { name: "ReportGenerator", description: "Report generation with customizable parameters, date ranges, filters, and email delivery" },
  { name: "ScheduledReportDialog", description: "Schedule report configuration with frequency, recipients, and output format" },
  { name: "ReportViewer", description: "Interactive report viewer with charts, summaries, and export options" },
  { name: "EnhancedRosterView", description: "Day/week roster view with drag-and-drop shift assignment" },
  { name: "DomCareRosterView", description: "Domiciliary care roster with visit management" },
  { name: "SupportedLivingRosterView", description: "Property-based roster for supported living" },
  { name: "DayCentreRosterView", description: "Session-based roster for day centres" },
  { name: "CarePlanManager", description: "Client care plan CRUD with AI generation" },
  { name: "CarePlanEditor", description: "Comprehensive care plan editing form" },
  { name: "CarePlanViewer", description: "Care plan display with all sections" },
  { name: "ShiftDialog", description: "Shift creation/editing modal" },
  { name: "VisitDialog", description: "Visit creation/editing for dom care" },
  { name: "CarerDialog", description: "Carer profile management" },
  { name: "ClientDialog", description: "Client profile management" },
  { name: "FormTemplateEditor", description: "Dynamic form builder interface" },
  { name: "StaffTaskManager", description: "Task assignment and tracking" },
  { name: "IncidentForm", description: "Incident reporting form" },
  { name: "FollowUpManager", description: "Follow-up tracking with automated reminders and escalation for internal/external requests" },
  { name: "ClientProgressReport", description: "Progress tracking for clients showing improvements/declines in behaviour, education, social, health, independence" },
  { name: "SupervisionForm", description: "Staff supervision recording" },
  { name: "MedicationManagement", description: "MAR sheet and medication tracking" },
  { name: "DocumentManager", description: "Document upload and management" },
  { name: "AccessibilityPanel", description: "Accessibility settings (theme, text size, colors)" },
  { name: "GlobalSearch", description: "System-wide search functionality" },
  { name: "OfflineDataManager", description: "Mobile offline data sync for schedules, care plans, and client info with localStorage caching" },
  { name: "RealTimeVisitUpdates", description: "Real-time visit updates and communication from the field with quick update buttons" },
  { name: "SecurePhotoUpload", description: "Secure photo/document upload for incidents, wounds, medications with confidentiality tagging" },
];

export default function TechnicalSpecification() {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedEntities, setExpandedEntities] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleEntity = (entityName) => {
    setExpandedEntities(prev => ({
      ...prev,
      [entityName]: !prev[entityName]
    }));
  };

  const generateDocument = () => {
    setIsGenerating(true);
    
    let content = `# CareRoster Technical Specification\n`;
    content += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    
    content += `## System Overview\n\n`;
    content += `CareRoster is a comprehensive care management system supporting:\n`;
    content += `- Residential Care\n- Domiciliary Care\n- Supported Living\n- Day Centre Services\n\n`;
    
    content += `## Entity Definitions\n\n`;
    
    const categories = [...new Set(Object.values(ENTITY_DEFINITIONS).map(e => e.category))];
    categories.forEach(category => {
      content += `### ${category}\n\n`;
      Object.entries(ENTITY_DEFINITIONS)
        .filter(([_, def]) => def.category === category)
        .forEach(([name, def]) => {
          content += `#### ${name}\n`;
          content += `${def.description}\n\n`;
          content += `| Field | Type | Required | Description |\n`;
          content += `|-------|------|----------|-------------|\n`;
          def.fields.forEach(field => {
            content += `| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.description} |\n`;
          });
          content += `\n`;
        });
    });
    
    content += `## Pages & Modules\n\n`;
    Object.entries(PAGE_DEFINITIONS).forEach(([module, pages]) => {
      content += `### ${module}\n\n`;
      pages.forEach(page => {
        content += `- **${page.name}**: ${page.description}\n`;
      });
      content += `\n`;
    });
    
    content += `## AI Features\n\n`;
    AI_FEATURES.forEach(feature => {
      content += `### ${feature.name}\n`;
      content += `Component: \`${feature.component}\`\n\n`;
      content += `${feature.description}\n\n`;
      content += `Capabilities:\n`;
      feature.capabilities.forEach(cap => {
        content += `- ${cap}\n`;
      });
      content += `\n`;
    });
    
    content += `## Key Components\n\n`;
    KEY_COMPONENTS.forEach(comp => {
      content += `- **${comp.name}**: ${comp.description}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CareRoster_TechnicalSpec_${format(new Date(), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
  };

  const entityCategories = [...new Set(Object.values(ENTITY_DEFINITIONS).map(e => e.category))];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Technical Specification</h1>
            <p className="text-gray-600">Complete system documentation for CareRoster</p>
          </div>
          <Button onClick={generateDocument} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download Spec
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="ai">AI Features</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="w-10 h-10 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold">{Object.keys(ENTITY_DEFINITIONS).length}</p>
                  <p className="text-sm text-gray-500">Entities</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Layout className="w-10 h-10 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold">
                    {Object.values(PAGE_DEFINITIONS).flat().length}
                  </p>
                  <p className="text-sm text-gray-500">Pages</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Server className="w-10 h-10 mx-auto mb-2 text-purple-600" />
                  <p className="text-3xl font-bold">{AI_FEATURES.length}</p>
                  <p className="text-sm text-gray-500">AI Features</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Component className="w-10 h-10 mx-auto mb-2 text-orange-600" />
                  <p className="text-3xl font-bold">{KEY_COMPONENTS.length}</p>
                  <p className="text-sm text-gray-500">Key Components</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  CareRoster is a comprehensive care management platform designed to support multiple care settings:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Residential Care</h4>
                    <p className="text-sm text-blue-700">Full shift scheduling, care planning, medication management, and compliance tracking for care homes.</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Domiciliary Care</h4>
                    <p className="text-sm text-green-700">Visit scheduling, run planning, mobile staff app, and client communication for home care services.</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-semibold text-indigo-800 mb-2">Supported Living</h4>
                    <p className="text-sm text-indigo-700">Property-based scheduling, shared housing management, and independence support tracking.</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-2">Day Centre</h4>
                    <p className="text-sm text-amber-700">Session management, activity planning, attendance tracking, and transport coordination.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities">
            <div className="space-y-6">
              {entityCategories.map(category => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(ENTITY_DEFINITIONS)
                        .filter(([_, def]) => def.category === category)
                        .map(([name, def]) => (
                          <div key={name} className="border rounded-lg">
                            <button
                              onClick={() => toggleEntity(name)}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                {expandedEntities[name] ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="font-medium">{name}</span>
                                <Badge variant="outline">{def.fields.length} fields</Badge>
                              </div>
                              <span className="text-sm text-gray-500 hidden md:block">{def.description}</span>
                            </button>
                            {expandedEntities[name] && (
                              <div className="px-4 pb-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 font-medium">Field</th>
                                      <th className="text-left py-2 font-medium">Type</th>
                                      <th className="text-left py-2 font-medium">Required</th>
                                      <th className="text-left py-2 font-medium">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {def.fields.map(field => (
                                      <tr key={field.name} className="border-b last:border-0">
                                        <td className="py-2 font-mono text-xs">{field.name}</td>
                                        <td className="py-2">
                                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                                        </td>
                                        <td className="py-2">
                                          {field.required ? (
                                            <Badge className="bg-red-100 text-red-700 text-xs">Yes</Badge>
                                          ) : (
                                            <span className="text-gray-400 text-xs">No</span>
                                          )}
                                        </td>
                                        <td className="py-2 text-gray-600">{field.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pages">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(PAGE_DEFINITIONS).map(([module, pages]) => (
                <Card key={module}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      {module}
                      <Badge variant="outline">{pages.length} pages</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pages.map(page => (
                        <div key={page.name} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-sm">{page.name}</p>
                          <p className="text-xs text-gray-500">{page.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {AI_FEATURES.map(feature => (
                <Card key={feature.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-purple-600" />
                      {feature.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                    <p className="text-xs font-medium text-gray-500 mb-2">Component: <code className="bg-gray-100 px-1 rounded">{feature.component}</code></p>
                    <div className="flex flex-wrap gap-1">
                      {feature.capabilities.map(cap => (
                        <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="components">
            <Card>
              <CardHeader>
                <CardTitle>Key Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {KEY_COMPONENTS.map(comp => (
                    <div key={comp.name} className="p-4 border rounded-lg">
                      <p className="font-medium text-sm mb-1">{comp.name}</p>
                      <p className="text-xs text-gray-500">{comp.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}