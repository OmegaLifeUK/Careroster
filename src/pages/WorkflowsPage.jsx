import React from "react";
import { Zap } from "lucide-react";
import AutomatedWorkflows from "../components/workflows/AutomatedWorkflows";

export default function WorkflowsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Zap className="w-8 h-8 text-blue-600" />
            Automated Workflows
          </h1>
          <p className="text-gray-500">
            Configure automated notifications, reminders, and processes
          </p>
        </div>

        <AutomatedWorkflows />
      </div>
    </div>
  );
}