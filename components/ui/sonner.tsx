"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          title: "group-[.toast]:font-semibold group-[.toast]:text-gray-900",
          description: "group-[.toast]:text-gray-600",
          actionButton: "group-[.toast]:bg-amber-500 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600 group-[.toast]:rounded-lg",
          success: "group-[.toaster]:!bg-emerald-50 group-[.toaster]:!border-emerald-200 group-[.toaster]:!text-emerald-800",
          error: "group-[.toaster]:!bg-red-50 group-[.toaster]:!border-red-200 group-[.toaster]:!text-red-800",
          warning: "group-[.toaster]:!bg-amber-50 group-[.toaster]:!border-amber-200 group-[.toaster]:!text-amber-800",
          info: "group-[.toaster]:!bg-blue-50 group-[.toaster]:!border-blue-200 group-[.toaster]:!text-blue-800",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-emerald-500" />,
        info: <InfoIcon className="size-5 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-500" />,
        error: <OctagonXIcon className="size-5 text-red-500" />,
        loading: <Loader2Icon className="size-5 animate-spin text-amber-500" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
