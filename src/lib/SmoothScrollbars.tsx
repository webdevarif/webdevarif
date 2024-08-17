'use client';
import React, { useEffect } from 'react';
import Scrollbar from 'smooth-scrollbar';

const SmoothScrollbars: React.FC = () => {
  useEffect(() => {
    // Select the element where you want to apply the smooth scrollbar
    const container = document.querySelector('.smooth-scrollbar') as HTMLElement | null;

    if (container) {
      // Initialize the scrollbar on the selected container
      Scrollbar.init(container);
    }

    // Cleanup function to remove the scrollbar instance on unmount
    return () => {
      // Destroy all scrollbar instances
      Scrollbar.destroyAll();
    };
  }, []);

  return null;
};

export default SmoothScrollbars;
