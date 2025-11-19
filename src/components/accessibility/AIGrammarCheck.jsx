import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AIGrammarCheck({ text, onCorrected }) {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkGrammar = async () => {
    if (!text || text.trim().length < 5) return;

    setIsChecking(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Check this text for grammar, spelling, and clarity issues. Return the corrected text and a list of improvements made.

Text to check:
${text}

Provide corrections while maintaining the original meaning and tone.`,
        response_json_schema: {
          type: "object",
          properties: {
            corrected_text: { type: "string" },
            improvements: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      onCorrected(result.corrected_text);
      
      if (result.improvements && result.improvements.length > 0) {
        toast.success("Improvements Made", result.improvements.join(', '));
      } else {
        toast.success("Perfect!", "No corrections needed");
      }
    } catch (error) {
      console.error("Grammar check error:", error);
      toast.error("Error", "Failed to check grammar");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={checkGrammar}
      disabled={isChecking || !text}
      className="flex items-center gap-1"
    >
      {isChecking ? (
        <>
          <Sparkles className="w-4 h-4 animate-spin" />
          <span className="text-xs">Checking...</span>
        </>
      ) : (
        <>
          <Check className="w-4 h-4" />
          <span className="text-xs">Check Grammar</span>
        </>
      )}
    </Button>
  );
}