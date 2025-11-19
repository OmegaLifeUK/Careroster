import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, AlertTriangle, Target } from "lucide-react";

export default function AIAuditAnalyzer({ auditRecords }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeAudits = async () => {
    setIsAnalyzing(true);
    try {
      const auditData = auditRecords.map(audit => ({
        area: audit.area_audited,
        date: audit.audit_date,
        outcome: audit.outcome,
        score: audit.percentage_score,
        non_compliances: audit.non_compliances,
        findings: audit.findings
      }));

      const prompt = `Analyze these audit records and identify:
1. High-risk areas that frequently fail or have low scores
2. Common patterns in non-compliance issues
3. Trends over time (improving/declining areas)
4. Specific recommendations for improvement

Audit Data:
${JSON.stringify(auditData, null, 2)}

Provide a structured analysis with clear sections for patterns, high-risk areas, trends, and recommendations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            high_risk_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  risk_level: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            common_patterns: {
              type: "array",
              items: { type: "string" }
            },
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  trend: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  recommendation: { type: "string" },
                  target_area: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyizing(false);
    }
  };

  const riskColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-orange-100 text-orange-800",
    low: "bg-yellow-100 text-yellow-800"
  };

  const priorityColors = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800"
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Audit Analysis
          </CardTitle>
          <Button 
            onClick={analyzeAudits} 
            disabled={isAnalyzing || auditRecords.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!analysis ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">AI-Powered Audit Intelligence</p>
            <p className="text-sm text-gray-400">Click "Run AI Analysis" to identify patterns and high-risk areas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {analysis.high_risk_areas && analysis.high_risk_areas.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  High-Risk Areas
                </h3>
                <div className="space-y-2">
                  {analysis.high_risk_areas.map((area, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{area.area}</h4>
                        <Badge className={riskColors[area.risk_level?.toLowerCase()] || riskColors.medium}>
                          {area.risk_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{area.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.common_patterns && analysis.common_patterns.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  Common Patterns
                </h3>
                <div className="space-y-2">
                  {analysis.common_patterns.map((pattern, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-gray-800">• {pattern}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.trends && analysis.trends.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                  Trends
                </h3>
                <div className="space-y-2">
                  {analysis.trends.map((trend, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{trend.area}</h4>
                        <Badge variant="outline">{trend.trend}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{trend.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className={priorityColors[rec.priority?.toLowerCase()] || priorityColors.medium}>
                            {rec.priority} Priority
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{rec.target_area}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{rec.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}