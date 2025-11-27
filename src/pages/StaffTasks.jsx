import React from "react";
import StaffTaskManager from "@/components/tasks/StaffTaskManager";

export default function StaffTasks() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <StaffTaskManager />
      </div>
    </div>
  );
}