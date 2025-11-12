import React from "react";
import { Shield } from "lucide-react";
import RoleManager from "../components/permissions/RoleManager";

export default function PermissionsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <RoleManager />
      </div>
    </div>
  );
}