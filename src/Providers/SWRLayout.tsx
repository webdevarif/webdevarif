'use client';
import React, { ReactNode } from 'react';
import { SWRConfig } from "swr";
import fetcher from '@/lib/fetcher';
import { GoogleTagManager } from '@next/third-parties/google';


const SWRLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SWRConfig value={{ fetcher }}>
            <GoogleTagManager gtmId="GTM-9QST1WG8ZQ" />
            {children}
        </SWRConfig>
    );
};

export default SWRLayout;
