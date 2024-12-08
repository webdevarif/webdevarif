"use client";

import React, { useEffect } from "react";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { imageAnimation } from "./imageAnimation";
// import { imageAnimation } from "./imageAnimation"; // Import image animation
// import { splitTextAnimation } from "./splitTextAnimation";
// import { AosAnimation } from "./aosAnimation";
// import { customAnimation } from "./customAnimate";
// import { FormHandle } from "./formHandle";
// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const CustomGSAP: React.FC = () => {
  useEffect(() => {
    // Use setTimeout to delay execution of animation setup
    const timeoutId = setTimeout(() => {
      // Call separate animation functions
      imageAnimation();
    //   splitTextAnimation();
    //   FormHandle();
    //     customAnimation();
    }, 300); // Adjust the delay as needed

    // Cleanup on component unmount
    return () => {
      clearTimeout(timeoutId);
      ScrollTrigger.getAll().forEach((instance) => instance.kill());
    };
  }, []);

  return null;
};

export default CustomGSAP;
