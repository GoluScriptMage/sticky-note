export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
  scale: number;
}

export interface StickyNote {
  id: string;
  noteName: string;
  content: string;
  createdBy?: string;
  x: number;
  y: number;
}