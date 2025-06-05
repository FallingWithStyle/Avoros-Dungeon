import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// --- Contrast functions for badge text ---
function hexToRgb(hex: string): [number, number, number] | null {
  // Accepts "#abc" or "#aabbcc"
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function luminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrast(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
) {
  const lum1 = luminance(...rgb1);
  const lum2 = luminance(...rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getContrastTextColor(
  badgeHex: string,
  preferred: "white" | "black" = "white",
) {
  const badgeRgb = hexToRgb(badgeHex);
  if (!badgeRgb) return preferred === "white" ? "#fff" : "#222";
  const white = [255, 255, 255] as [number, number, number];
  const black = [34, 34, 34] as [number, number, number]; // Or [0,0,0]
  const contrastWithWhite = contrast(badgeRgb, white);
  const contrastWithBlack = contrast(badgeRgb, black);
  if (contrastWithWhite >= 4.5) return "#fff";
  if (contrastWithBlack >= 4.5) return "#222";
  // fallback: pick whichever is higher
  return contrastWithWhite > contrastWithBlack ? "#fff" : "#222";
}

// Badge variants unchanged
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  color?: string; // Optional: custom badge background hex color
}

function Badge({ className, variant, color, style, ...props }: BadgeProps) {
  // If a custom color is provided, apply it and compute text color
  let customStyle = style;
  if (color) {
    const textColor = getContrastTextColor(color);
    customStyle = {
      ...style,
      backgroundColor: color,
      color: textColor,
      borderColor: "transparent",
    };
  }
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={customStyle}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
