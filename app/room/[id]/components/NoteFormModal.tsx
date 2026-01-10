"use client";

import { ReactNode } from "react";

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function NoteFormModal({ isOpen, onClose, children }: NoteFormModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-9998"
        onClick={onClose}
      />
      {/* Modal container */}
      <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </>
  );
}
