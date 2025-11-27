import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Plus, 
  BookOpen, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";

import TrainingModuleManager from "../components/training/TrainingModuleManager";
import AssignTrainingDialog from "../components/training/AssignTrainingDialog";
import TrainingComplianceReport from "../components/training/TrainingComplianceReport";
import AITrainingAnalyzer from "../components/training/AITrainingAnalyzer";

export default function StaffTraining() {
  const [activeTab, setActiveTab] = useState("modules");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  const { data: trainingModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => base44.entities.TrainingModule.list('-created_date'),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: () => base44.entities.TrainingAssignment.list('-assigned_date'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const activeModules = trainingModules.filter(m => m.is_active).length;
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const overdueAssignments = assignments.filter(a => a.status === 'overdue').length;
  const completionRate = totalAssignments > 0 
    ? ((completedAssignments / totalAssignments) * 100).toFixed(1) 
    : 0;

  const handleAssignTraining = (module) => {
    setSelectedModule(module);
    setShowAssignDialog(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <GraduationCap className="w-8 h-8" />
              Staff Training
            </h1>
            <p className="text-gray-500">Manage training modules, assignments, and track completion</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("modules")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{activeModules}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("compliance")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("compliance")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-orange-600">{overdueAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            onClick={() => setActiveTab("ai_insights")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2 overflow-x-auto">
          <Button
            variant={activeTab === "modules" ? "default" : "ghost"}
            onClick={() => setActiveTab("modules")}
            className="flex-shrink-0"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Training Modules
          </Button>
          <Button
            variant={activeTab === "compliance" ? "default" : "ghost"}
            onClick={() => setActiveTab("compliance")}
            className="flex-shrink-0"
          >
            <Users className="w-4 h-4 mr-2" />
            Compliance Report
          </Button>
          <Button
            variant={activeTab === "ai_insights" ? "default" : "ghost"}
            onClick={() => setActiveTab("ai_insights")}
            className="flex-shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            AI Insights
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "modules" && (
          <TrainingModuleManager
            modules={trainingModules}
            assignments={assignments}
            staff={staff}
            carers={carers}
            onAssignTraining={handleAssignTraining}
            isLoading={modulesLoading}
          />
        )}

        {activeTab === "compliance" && (
          <TrainingComplianceReport
            modules={trainingModules}
            assignments={assignments}
            staff={staff}
            carers={carers}
            isLoading={modulesLoading || assignmentsLoading}
          />
        )}

        {activeTab === "ai_insights" && (
          <AITrainingAnalyzer />
        )}

        {showAssignDialog && (
          <AssignTrainingDialog
            module={selectedModule}
            staff={staff}
            carers={carers}
            existingAssignments={assignments}
            onClose={() => {
              setShowAssignDialog(false);
              setSelectedModule(null);
            }}
          />
        )}
      </div>
    </div>
  );
}