// ./src/components/common/Heading.tsx
import React from "react";
import { cn } from "@/lib/utils";

// Define the valid HTML heading elements for the 'as' prop
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// Define the sizes your component supports
type HeadingSize = "5xl" |"4xl" | "3xl" | "2xl" | "xl";

// Define the props interface for the Heading component
interface HeadingProps {
  as?: HeadingTag;
  size?: HeadingSize;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  as: Comp = "h1",
  size = "4xl",
  children,
  className,
  id,
}) => {
  return (
    <Comp
      // Add the ID to the heading itself
      id={id}
      className={cn(
        "font-semibold mb-0 inline-block text-dark",
        size === "5xl" && "text-3xl md:text-5xl",
        size === "4xl" && "text-3xl md:text-4xl",
        size === "3xl" && "text-3xl",
        size === "2xl" && "text-2xl",
        size === "xl" && "text-xl",
        className
      )}
    >
      {children}
    </Comp>
  );
};
