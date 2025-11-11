import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MobileDrawer = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  position = "bottom" // "bottom", "right", "left"
}) => {
  const positions = {
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      className: "bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]"
    },
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      className: "top-0 right-0 bottom-0 w-full md:w-96 rounded-l-2xl"
    },
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
      className: "top-0 left-0 bottom-0 w-full md:w-96 rounded-r-2xl"
    }
  };

  const config = positions[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed bg-white shadow-2xl z-50 overflow-hidden ${config.className}`}
          >
            <div className="flex flex-col h-full">
              {title && (
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};