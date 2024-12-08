import React from 'react';

const Skeleton = () => {
  return (
    <div className='animate-pulse bg-white shadow-sm p-2 rounded-[1.5rem]'>
      <div className="w-full min-h-[16rem] h-[35vh] bg-background rounded mb-3"></div>
      <div className=" px-4">
        <div className="flex gap-2">
          <span className="w-1/6 h-5 bg-background rounded mb-2"></span>        
          <span className="w-1/6 h-5 bg-background rounded mb-2"></span>        
          <span className="w-1/6 h-5 bg-background rounded mb-2"></span>        
        </div>
        <div className="h-6 w-full bg-background rounded mb-4"></div>
        <div className="h-7 w-[6rem] bg-background rounded mb-5"></div>
      </div>
    </div>
  );
}

export default Skeleton;
