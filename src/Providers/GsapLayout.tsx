"use client";

import React, { useEffect } from "react";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { imageAnimation } from "@/custom/imageAnimation";

const GsapLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Dom-specific code, like animations, goes here because it's safe to access the DOM.
    const timeoutId = setTimeout(() => {
      // Ensure consistent execution without non-deterministic values
      imageAnimation();
    }, 400); // This delay shouldn't affect the render consistency

    // Cleanup to remove any persistent effects
    return () => {
      clearTimeout(timeoutId);
      // Register GSAP plugins
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.getAll().forEach((instance) => instance.kill());
    };
  }, []); // Empty dependency array runs this effect only on mount/unmount

  return <React.Fragment>{children}</React.Fragment>;
};

export default GsapLayout;
