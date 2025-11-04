import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Users, 
  UserCircle, 
  Calendar,
  TrendingUp,
  Download
} from "lucide-react";

import StaffPerformanceReport from "../components/domcare/reports/StaffPerformanceReport";
import ClientVisitHistory from "../components/domcare/reports/ClientVisitHistory";

export default function DomCareReports() {
  const [activeTab, setActiveTab] = useState("staff-performance");

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-scheduled_start'),
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: () => base44.entities.DomCareClient.list(),
  });

  const isLoading = visitsLoading || staffLoading || clientsLoading;

  const reportTypes = [
    {
      id: "staff-performance",
      title: "Staff Performance",
      description: "Track performance metrics and KPIs",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "client-history",
      title: "Client Visit History",
      description: "Complete visit records per client",
      icon: UserCircle,
      color: "from-green-500 to-green-600",
    },
  ];

  const renderReport = () => {
    switch (activeTab) {
      case "staff-performance":
        return <StaffPerformanceReport visits={visits} staff={staff} clients={clients} isLoading={isLoading} />;
      case "client-history":
        return <ClientVisitHistory visits={visits} staff={staff} clients={clients} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Domiciliary Care Reports</h1>
          <p className="text-gray-500">Comprehensive analytics and reporting for domiciliary care operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === report.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setActiveTab(report.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center flex-shrink-0`}>
                    <report.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {renderReport()}
      </div>
    </div>
  );
}