"use client"

import { motion } from "framer-motion"

export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="h-full w-full border-4 border-primary border-t-transparent rounded-full"></div>
    </motion.div>
  )
}