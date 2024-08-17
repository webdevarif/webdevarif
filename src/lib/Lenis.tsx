"use client";
import React, { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LenisSmooth: React.FC = () => {
  useEffect(() => {
    const lenisInstance = new Lenis();
    lenisInstance.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenisInstance.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      // Clean up if necessary
      gsap.ticker.remove((time) => {
        lenisInstance.raf(time * 1000);
      });
      lenisInstance.destroy();
    };
  }, []);

  return null;
};

export default LenisSmooth;
