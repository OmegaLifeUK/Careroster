import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import CustomReportBuilder from "../components/reports/CustomReportBuilder";
import { ExportButton } from "@/components/ui/export-button";

export default function CustomReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [reportConfig, setReportConfig] = useState(null);

  const { data: allData = {} } = useQuery({
    queryKey: ['all-entities-for-reports'],
    queryFn: async () => {
      const [shifts, carers, clients, incidents, training, medications] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Carer.list(),
        base44.entities.Client.list(),
        base44.entities.Incident.list(),
        base44.entities.TrainingAssignment.list(),
        base44.entities.MedicationLog.list(),
      ]);
      return { shifts, carers, clients, incidents, training, medications };
    },
  });

  const handleRunReport = (config) => {
    setReportConfig(config);
    
    // Get data for selected entity
    const entityData = allData[config.entity] || [];
    
    // Apply filters
    let filtered = entityData;
    config.filters.forEach(filter => {
      if (!filter.field || !filter.value) return;
      
      filtered = filtered.filter(item => {
        const value = item[filter.field];
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          default:
            return true;
        }
      });
    });

    // Apply date range filter
    if (config.dateRange.start || config.dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = item.date || item.created_date;
        if (!itemDate) return false;
        
        if (config.dateRange.start && itemDate < config.dateRange.start) return false;
        if (config.dateRange.end && itemDate > config.dateRange.end) return false;
        return true;
      });
    }

    // Select only requested fields
    const result = filtered.map(item => {
      const selected = {};
      config.selectedFields.forEach(field => {
        selected[field] = item[field];
      });
      return selected;
    });

    setReportData(result);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            Custom Report Builder
          </h1>
          <p className="text-gray-500">
            Create custom reports with your own fields, filters, and visualizations
          </p>
        </div>

        <CustomReportBuilder onRunReport={handleRunReport} />

        {/* Report Results */}
        {reportData && (
          <Card className="mt-6">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  {reportConfig?.name || 'Report Results'}
                </CardTitle>
                <ExportButton
                  data={reportData}
                  filename={reportConfig?.name?.replace(/\s+/g, '_') || 'custom_report'}
                  columns={reportConfig?.selectedFields?.map(field => ({
                    key: field,
                    header: field.replace('_', ' ')
                  })) || []}
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4">
                <Badge className="bg-blue-600 text-white">
                  {reportData.length} records found
                </Badge>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {reportConfig?.selectedFields.map(field => (
                        <th key={field} className="text-left p-3 font-semibold text-gray-700">
                          {field.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {reportConfig?.selectedFields.map(field => (
                          <td key={field} className="p-3 text-gray-600">
                            {Array.isArray(row[field]) 
                              ? row[field].join(', ') 
                              : String(row[field] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {reportData.length > 50 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing 50 of {reportData.length} records. Export to see all data.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}