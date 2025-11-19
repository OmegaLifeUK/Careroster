import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function TrainingMatrixGrid({ staff, trainingModules, assignments }) {
  const getStaffTrainingStatus = (staffId, moduleId) => {
    const assignment = assignments.find(a => 
      a.staff_id === staffId && a.training_module_id === moduleId
    );
    
    if (!assignment) return { status: 'not_assigned', color: 'bg-gray-200' };
    
    if (assignment.completion_status === 'completed') {
      const expiryDate = new Date(assignment.expiry_date);
      const today = new Date();
      
      if (expiryDate < today) {
        return { status: 'expired', color: 'bg-red-500', date: assignment.completion_date };
      }
      return { status: 'completed', color: 'bg-green-500', date: assignment.completion_date };
    }
    
    if (assignment.completion_status === 'in_progress') {
      return { status: 'in_progress', color: 'bg-yellow-500' };
    }
    
    return { status: 'pending', color: 'bg-blue-300' };
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Staff Training Compliance Matrix</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold sticky left-0 bg-gray-50 z-10">
                  Staff Member
                </th>
                {trainingModules.map(module => (
                  <th key={module.id} className="px-4 py-3 text-left text-sm font-semibold min-w-[120px]">
                    <div className="truncate">{module.module_name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(staffMember => (
                <tr key={staffMember.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-white">
                    {staffMember.full_name}
                  </td>
                  {trainingModules.map(module => {
                    const status = getStaffTrainingStatus(staffMember.id, module.id);
                    return (
                      <td key={module.id} className="px-4 py-3">
                        <div className={`w-full h-8 ${status.color} rounded flex items-center justify-center text-white text-xs font-medium`}>
                          {status.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                          {status.status === 'expired' && <XCircle className="w-4 h-4" />}
                          {status.status === 'in_progress' && <Clock className="w-4 h-4" />}
                          {status.date && (
                            <span className="ml-1">{new Date(status.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Expired</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span>Not Assigned</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}