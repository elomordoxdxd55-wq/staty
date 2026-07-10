import React from "react";
import { motion } from "framer-motion";

export default function ProgressBar({ current, target, color = "#22c55e", label, showValues = true }) {
  const pct = target > 0 ? Math.min(Math.round(current / target * 100), 100) : 0;

  return (
    <div className="space-y-2">
      {label &&
      <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showValues &&
        <span className="text-sm text-muted-foreground">
              {current.toLocaleString()} / {target.toLocaleString()}
            </span>
        }
        </div>
      }
      







      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        
        
      </div>
    </div>);

}