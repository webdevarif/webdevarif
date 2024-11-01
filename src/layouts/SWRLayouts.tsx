'use client';
import React, { ReactNode } from 'react';
import { SWRConfig } from "swr";
import fetcher from '@/lib/fetcher';

const SWRLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SWRConfig value={{ fetcher }}>
            {children}
        </SWRConfig>
    );
};

export default SWRLayout;
