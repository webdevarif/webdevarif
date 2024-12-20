"use client";
import PageLayout from '@/Providers/PageLayout';
import React, { useEffect } from 'react';

const SchedulePage: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <PageLayout>
      {/* Heading */}
      <div className="pt-[100px] text-center">
        <div className="container">
          <h5 className="font-unbounded text-3xl lg:text-5xl font-semibold uppercase mb-[3rem]">Schedule a meeting</h5>
          <div className="">
            {/* Calendly inline widget begin */}
            <div
              className="calendly-inline-widget"
              data-url="https://calendly.com/webgeniusplus/30min"
              style={{ minWidth: '320px', height: '700px' }}
            ></div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SchedulePage;
