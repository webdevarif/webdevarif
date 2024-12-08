import React from 'react';

const Skeleton = () => {
  return (
    Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className='animate-pulse'>
        <div className="w-full h-[25vh] mb-4 bg-card overflow-hidden rounded-xl"></div>
        <div className="flex space-x-3 flex-wrap items-center mb-2">
          <div className="h-[1.25rem] w-[3.75rem] bg-card rounded-xl mb-2"></div>
          <div className="h-[1.25rem] w-[3.75rem] bg-card rounded-xl mb-2"></div>
          <div className="h-[1.25rem] w-[3.75rem] bg-card rounded-xl mb-2"></div>
        </div>
        <div className="h-[1.5rem] w-full bg-card rounded-xl mb-2"></div>
        <div className="h-[1.5rem] w-2/4 bg-card rounded-xl mb-3"></div>

        <div className="h-[1rem] w-full bg-card rounded-xl mb-2"></div>
        <div className="h-[1rem] w-full bg-card rounded-xl mb-2"></div>
        <div className="h-[1rem] w-full bg-card rounded-xl mb-2"></div>
        <div className="h-[1rem] w-full bg-card rounded-xl mb-2"></div>
        <div className="h-[1rem] w-1/4 bg-card rounded-xl"></div>
      </div>
    ))
  );
}

export default Skeleton;
