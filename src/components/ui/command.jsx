import React, { useState, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CommandPalette({ isOpen, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          if (cmd.action) cmd.action();
          if (cmd.url) navigate(cmd.url);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-32">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-lg"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No commands found</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (cmd.action) cmd.action();
                    if (cmd.url) navigate(cmd.url);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors ${
                    idx === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  {Icon && (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{cmd.label}</p>
                    {cmd.description && (
                      <p className="text-sm text-gray-500">{cmd.description}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <div className="flex gap-4">
            <span><kbd className="px-2 py-1 bg-white border rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> Select</span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}