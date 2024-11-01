'use client';
import React, { ReactNode, useEffect } from 'react';

const PageLayout: React.FC<{ children: ReactNode}> = ({ children }) => {
    return (
        <div className="mt-[90px]">
            {children}
        </div>
    );
};

export default PageLayout;
