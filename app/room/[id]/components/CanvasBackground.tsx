"use client";

import { motion, MotionValue, useMotionTemplate, useTransform } from "framer-motion";

interface CanvasBackgroundProps {
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  springScale: MotionValue<number>;
}

export function CanvasBackground({ springX, springY, springScale }: CanvasBackgroundProps) {
  // Background dots: maintain minimum 15px spacing for visibility at low zoom
  const bgSize = useTransform(springScale, (s) => {
    const baseSize = 20;
    const size = Math.max(15, baseSize * s);
    return `${size}px ${size}px`;
  });
  const bgPosition = useMotionTemplate`${springX}px ${springY}px`;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
      }}
    />
  );
}
