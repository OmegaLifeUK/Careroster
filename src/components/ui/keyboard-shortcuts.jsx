import React, { useState, useEffect } from "react";
import { Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const KeyboardShortcuts = () => {
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { key: "⌘K", description: "Open global search" },
    { key: "⌘N", description: "Create new (context-dependent)" },
    { key: "ESC", description: "Close modals/dialogs" },
    { key: "?", description: "Show keyboard shortcuts" },
    { key: "↑↓", description: "Navigate search results" },
    { key: "ENTER", description: "Select/Confirm" },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show/hide help with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        // Don't trigger if user is typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
      
      // Close help with ESC
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  return (
    <>
      {/* Help button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Keyboard shortcuts (?)"
      >
        <Command className="w-5 h-5 text-gray-600" />
      </button>

      {/* Help modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Keyboard Shortcuts
              </h3>
              
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};