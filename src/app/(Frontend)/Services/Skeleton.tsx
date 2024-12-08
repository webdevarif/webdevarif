import React from 'react';

const Skeleton = () => {
  return (
    <div className='animate-pulse px-6 bg-white shadow-sm py-[4rem] rounded-[1.5rem]'>
      <div className="w-[4rem] aspect-square bg-background rounded mb-7"></div>
      <div className="h-6 w-full bg-background rounded mb-7"></div>
      <div className="h-3 w-full bg-background rounded mb-2"></div>
      <div className="h-3 w-full bg-background rounded mb-2"></div>
      <div className="h-3 w-full bg-background rounded mb-2"></div>
      <div className="h-3 w-3/4 bg-background rounded mb-7"></div>
      <div className="h-7 w-[6rem] bg-background rounded"></div>
    </div>
  );
}

export default Skeleton;
