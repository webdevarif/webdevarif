import React from 'react';

const Skeleton = () => {
  return (
    <div className='animate-pulse w-full px-6 bg-white shadow-sm py-[4rem] rounded-[1.5rem] grid grid-cols-[4fr_8fr]'>
      <div className="w-5/6 m-auto aspect-square rounded-full bg-background rounded"></div>
      <div className="flex flex-col">
        <div className="h-6 w-1/4 bg-background rounded mb-2"></div>
        <div className="h-3 w-1/4 bg-background rounded mb-8"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-full bg-background rounded mb-2"></div>
        <div className="h-3 w-3/4 bg-background rounded mb-7"></div>
        <div className="h-14 w- bg-background rounded mt-auto"></div>
      </div>
    </div>
  );
}

export default Skeleton;
