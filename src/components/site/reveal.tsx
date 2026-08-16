"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Lightweight scroll-reveal wrapper — fades and slides content up the first
 * time it enters the viewport. Used across the public homepage to make the
 * page feel alive without hurting performance (single render, no re-trigger).
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
