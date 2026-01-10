import type { SpringOptions } from "framer-motion";

// Scale limits
export const MIN_SCALE = 0.25; // 25% minimum zoom
export const MAX_SCALE = 3.0; // 300% maximum zoom

// Interaction sensitivity
export const ZOOM_SENSITIVITY = 0.008; // For trackpad zoom
export const ZOOM_BUTTON_STEP = 0.15; // For +/- buttons
export const PAN_SPEED = 50; // For keyboard panning

// Spring config for buttery smooth 60fps animations
export const SPRING_CONFIG: SpringOptions = {
  stiffness: 400,
  damping: 35,
  mass: 0.3,
};
