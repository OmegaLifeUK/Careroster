import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  FileText, 
  Users, 
  UserCircle, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Download
} from "lucide-react";

import CarerHoursReport from "../components/reports/CarerHoursReport";
import ClientVisitsReport from "../components/reports/ClientVisitsReport";
import ShiftFillRateReport from "../components/reports/ShiftFillRateReport";
import MileageReport from "../components/reports/MileageReport";
import PayrollReport from "../components/reports/PayrollReport";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("carer-hours");

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const isLoading = shiftsLoading || carersLoading || clientsLoading;

  const reportTypes = [
    {
      id: "carer-hours",
      title: "Carer Hours & Performance",
      description: "Track working hours and performance metrics",
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "client-visits",
      title: "Client Visit Summaries",
      description: "Overview of client care and visits",
      icon: UserCircle,
      color: "from-green-500 to-green-600",
    },
    {
      id: "shift-fill",
      title: "Shift Fill Rates",
      description: "Analyze shift coverage and gaps",
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "mileage",
      title: "Mileage & Travel",
      description: "Track travel distances and times",
      icon: TrendingUp,
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "payroll",
      title: "Payroll Summary",
      description: "Calculate earnings and costs",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-500">Generate comprehensive reports for your care operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === report.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setActiveTab(report.id)}
            >
              <CardContent className="p-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center mb-3`}>
                  <report.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                <p className="text-xs text-gray-500">{report.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="carer-hours">
            <CarerHoursReport shifts={shifts} carers={carers} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="client-visits">
            <ClientVisitsReport shifts={shifts} clients={clients} carers={carers} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="shift-fill">
            <ShiftFillRateReport shifts={shifts} carers={carers} clients={clients} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="mileage">
            <MileageReport shifts={shifts} carers={carers} clients={clients} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollReport shifts={shifts} carers={carers} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}