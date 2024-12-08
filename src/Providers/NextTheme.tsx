'use client';
import React, { ReactNode } from 'react';
import { ThemeProvider } from "next-themes";

const NextTheme: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
        </ThemeProvider>
    );
};

export default NextTheme;
