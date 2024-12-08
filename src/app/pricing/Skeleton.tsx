import React from 'react';

const Skeleton = () => {
  return (
    <div className='animate-pulse bg-white shadow-sm p-5 rounded-xl'>
      <div className="w-1/4 h-6 bg-background rounded mb-4"></div>
      <div className="w-3/4 h-12 bg-background rounded mb-3"></div>
      <div className="w-full h-5 bg-background rounded mb-5"></div>

      <div className="w-full h-[9rem] bg-background rounded mb-5"></div>      
      <div className="w-2/6 h-7 bg-background rounded mb-3"></div>
      <div className="w-5/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-5/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-4/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-5/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-4/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-5/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-5/6 h-5 bg-background rounded mb-2"></div>        
      <div className="w-4/6 h-5 bg-background rounded mb-6"></div>        
      <div className="h-8 w-2/4 bg-background rounded mb-5"></div>
    </div>
  );
}

export default Skeleton;
