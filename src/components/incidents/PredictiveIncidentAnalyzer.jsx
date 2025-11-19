import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Users,
  Shield,
  CheckCircle,
  Calendar,
  Target
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function PredictiveIncidentAnalyzer({ incidents, clients, staff }) {
  const [predictions, setPredictions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [] } = useQuery({
    queryKey: ['predictive-alerts'],
    queryFn: async () => {
      const data = await base44.entities.PredictiveIncidentAlert.filter({ status: 'active' });
      return Array.isArray(data) ? data : [];
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, actions }) => 
      base44.entities.PredictiveIncidentAlert.update(id, {
        status: 'acknowledged',
        acknowledged_by: 'Current User',
        acknowledged_at: new Date().toISOString(),
        mitigation_actions: actions
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-alerts'] });
      toast.success("Alert Acknowledged", "Risk mitigation actions recorded");
    },
  });

  const runPredictiveAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const last90Days = incidents.filter(inc => {
        const incDate = new Date(inc.incident_date);
        const daysDiff = (Date.now() - incDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 90;
      });

      const incidentSummary = last90Days.map(inc => ({
        type: inc.incident_type,
        severity: inc.severity,
        date: inc.incident_date,
        time: new Date(inc.incident_date).getHours(),
        day: new Date(inc.incident_date).toLocaleDateString('en-US', { weekday: 'long' }),
        location: inc.location,
        client_id: inc.client_id,
        is_safeguarding: inc.is_safeguarding_concern,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these ${incidentSummary.length} incidents from the last 90 days and predict potential future incidents.

Incident Data:
${JSON.stringify(incidentSummary, null, 2)}

Analyze for:
1. Incident type patterns (which types occur most frequently)
2. Temporal patterns (time of day, day of week when incidents peak)
3. Location patterns (high-risk locations)
4. Severity trends (are incidents getting more or less severe)
5. Client patterns (clients with repeated incidents)

Provide:
- High-risk predictions with confidence levels
- Specific timeframes when risk is highest
- Locations requiring attention
- Proactive recommendations to prevent incidents
- Risk mitigation strategies

Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            high_risk_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  incident_type: { type: "string" },
                  probability: { type: "string" },
                  timeframe: { type: "string" },
                  risk_factors: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            temporal_patterns: {
              type: "object",
              properties: {
                high_risk_hours: {
                  type: "array",
                  items: { type: "string" }
                },
                high_risk_days: {
                  type: "array",
                  items: { type: "string" }
                },
                pattern_description: { type: "string" }
              }
            },
            location_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: { type: "string" },
                  risk_level: { type: "string" },
                  common_incidents: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string" },
                  rationale: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            trend_analysis: {
              type: "object",
              properties: {
                severity_trend: { type: "string" },
                frequency_trend: { type: "string" },
                key_insights: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      });

      setPredictions(result);

      const alertsToCreate = [];
      
      if (result.high_risk_predictions?.length > 0) {
        result.high_risk_predictions.forEach(pred => {
          alertsToCreate.push({
            alert_type: 'high_risk_pattern',
            risk_level: pred.probability?.toLowerCase().includes('high') ? 'high' : 'medium',
            predicted_incident_types: [pred.incident_type],
            risk_factors: pred.risk_factors?.map(f => ({ factor: f, confidence: 0.8 })) || [],
            recommendations: result.recommendations?.slice(0, 3).map(r => ({
              action: r.action,
              priority: r.priority,
              rationale: r.rationale
            })) || [],
            pattern_analysis: {
              temporal_patterns: result.temporal_patterns?.pattern_description || '',
              common_patterns: result.trend_analysis?.key_insights || []
            },
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
        });
      }

      if (result.temporal_patterns?.high_risk_hours?.length > 0) {
        alertsToCreate.push({
          alert_type: 'temporal_risk',
          risk_level: 'medium',
          time_window: {
            start: result.temporal_patterns.high_risk_hours[0],
            end: result.temporal_patterns.high_risk_hours[result.temporal_patterns.high_risk_hours.length - 1]
          },
          recommendations: [{
            action: 'Increase staff supervision during high-risk hours',
            priority: 'high',
            rationale: result.temporal_patterns.pattern_description
          }],
          pattern_analysis: {
            temporal_patterns: result.temporal_patterns.pattern_description
          },
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      if (result.location_risks?.length > 0) {
        result.location_risks.forEach(loc => {
          if (loc.risk_level?.toLowerCase() === 'high') {
            alertsToCreate.push({
              alert_type: 'location_risk',
              risk_level: 'high',
              location: loc.location,
              predicted_incident_types: loc.common_incidents || [],
              recommendations: [{
                action: `Conduct risk assessment for ${loc.location}`,
                priority: 'high',
                rationale: `High frequency of incidents at this location`
              }],
              expires_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        });
      }

      if (alertsToCreate.length > 0) {
        await base44.entities.PredictiveIncidentAlert.bulkCreate(alertsToCreate);
        queryClient.invalidateQueries({ queryKey: ['predictive-alerts'] });
      }

      toast.success("Analysis Complete", `Generated ${alertsToCreate.length} proactive alerts`);
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error("Error", "Failed to run predictive analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  const alertIcons = {
    high_risk_pattern: TrendingUp,
    temporal_risk: Clock,
    location_risk: MapPin,
    staff_risk: Users,
    client_risk: Shield
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-l-4 border-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Predictive Incident Prevention</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  AI-powered analysis to prevent incidents before they occur
                </p>
              </div>
            </div>
            <Button
              onClick={runPredictiveAnalysis}
              disabled={isAnalyzing || incidents.length < 5}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {isAnalyzing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="border-b bg-orange-50">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Active Risk Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {alerts.map((alert) => {
                const Icon = alertIcons[alert.alert_type] || Target;
                return (
                  <div key={alert.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-orange-600" />
                        <div>
                          <Badge className={riskColors[alert.risk_level]}>
                            {alert.risk_level} risk
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1 capitalize">
                            {alert.alert_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeMutation.mutate({ 
                          id: alert.id, 
                          actions: ['Reviewed by staff'] 
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>

                    {alert.predicted_incident_types?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Predicted Incidents:</p>
                        <div className="flex flex-wrap gap-2">
                          {alert.predicted_incident_types.map((type, idx) => (
                            <Badge key={idx} variant="outline" className="capitalize">
                              {type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {alert.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>Location: {alert.location}</span>
                      </div>
                    )}

                    {alert.recommendations?.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Recommended Actions:</p>
                        <ul className="space-y-2">
                          {alert.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                              <Badge className="bg-blue-600 text-white text-xs mt-0.5">
                                {rec.priority}
                              </Badge>
                              <span>{rec.action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions Display */}
      {predictions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Risk Predictions */}
          {predictions.high_risk_predictions?.length > 0 && (
            <Card>
              <CardHeader className="border-b bg-red-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  High Risk Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {predictions.high_risk_predictions.map((pred, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium capitalize">{pred.incident_type?.replace(/_/g, ' ')}</p>
                        <Badge className="bg-red-100 text-red-800">
                          {pred.probability}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pred.timeframe}</p>
                      {pred.risk_factors?.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Factors: {pred.risk_factors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temporal Patterns */}
          {predictions.temporal_patterns && (
            <Card>
              <CardHeader className="border-b bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Temporal Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-gray-700 mb-4">
                  {predictions.temporal_patterns.pattern_description}
                </p>
                {predictions.temporal_patterns.high_risk_hours?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">High-Risk Hours:</p>
                    <div className="flex flex-wrap gap-2">
                      {predictions.temporal_patterns.high_risk_hours.map((hour, idx) => (
                        <Badge key={idx} variant="outline">{hour}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {predictions.temporal_patterns.high_risk_days?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">High-Risk Days:</p>
                    <div className="flex flex-wrap gap-2">
                      {predictions.temporal_patterns.high_risk_days.map((day, idx) => (
                        <Badge key={idx} variant="outline">{day}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Location Risks */}
          {predictions.location_risks?.length > 0 && (
            <Card>
              <CardHeader className="border-b bg-orange-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Location Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {predictions.location_risks.map((loc, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{loc.location}</p>
                        <Badge className={riskColors[loc.risk_level?.toLowerCase()] || riskColors.medium}>
                          {loc.risk_level}
                        </Badge>
                      </div>
                      {loc.common_incidents?.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Common: {loc.common_incidents.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {predictions.recommendations?.length > 0 && (
            <Card>
              <CardHeader className="border-b bg-green-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Preventive Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {predictions.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className={`${riskColors[rec.priority?.toLowerCase()] || riskColors.medium} text-xs`}>
                          {rec.priority}
                        </Badge>
                        <p className="font-medium text-sm flex-1">{rec.action}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{rec.rationale}</p>
                      <p className="text-xs text-green-700 font-medium">
                        Expected Impact: {rec.expected_impact}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!predictions && !isAnalyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Prevention</h3>
            <p className="text-gray-600 mb-4">
              Run predictive analysis to identify patterns and prevent future incidents
            </p>
            <p className="text-sm text-gray-500">
              Requires at least 5 historical incidents for meaningful analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}