import React, { useState, useEffect } from "react";
import { X, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const shortcuts = [
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "Escape", description: "Close modals and dialogs" },
  { key: "Ctrl/Cmd + K", description: "Quick search (coming soon)" },
  { key: "G then D", description: "Go to Dashboard" },
  { key: "G then S", description: "Go to Schedule" },
  { key: "G then C", description: "Go to Clients" },
  { key: "G then T", description: "Go to Staff/Carers" },
  { key: "G then R", description: "Go to Reports" },
  { key: "N", description: "Create new (context-aware)" },
];

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Show/hide help with "?"
      if (e.key === "?" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }

      // Close with Escape
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  return (
    <>
      {/* Help button - fixed bottom right */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Command className="w-5 h-5" />
      </button>

      {/* Modal overlay */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in"
          onClick={() => setShowHelp(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Command className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle>Keyboard Shortcuts</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelp(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-lg shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> Press <kbd className="px-2 py-1 text-xs font-semibold bg-white border border-blue-300 rounded">?</kbd> anytime to see this help screen.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}