'use client';
import { useGlobalSettings } from '@/actions/queries';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import React, { ReactNode } from 'react';

const PrimaryLayout: React.FC<{
    children: ReactNode
}> = ({ children }) => {
  const { data, error } = useGlobalSettings();

  if (error) return <div>Error loading data.</div>;
  if (!data) return;

    return (
        <React.Fragment>
            <Header
                identity={data?.identity}
                menu={data?.menu}
            />
            <div>{children}</div>

            <Footer 
                identity={data?.identity}
                menu={data?.menu}
            />
        </React.Fragment>
    );
};

export default PrimaryLayout;
