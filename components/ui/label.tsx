import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  htmlFor,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-foreground block", className)}
      {...props}
    />
  );
}