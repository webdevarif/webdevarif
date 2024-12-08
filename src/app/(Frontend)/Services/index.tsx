"use client";
import React, { useState } from 'react';
import SectionHeading from '@/components/Common/SectionHeading';
import { useServices } from '@/actions/queries';
import CardService from '@/components/Card/CardService';
import Skeleton from './Skeleton';

const Services = () => {
  const [pageSize] = useState<number>(4);
  const { data, isLoading } = useServices(`per-page=${pageSize}`);

  return (
    <section className='bg-white/50 py-[6rem]'>
      <div className="container">
        <SectionHeading caption="Services" title="My Quality Services" />

        <div className="grid grid-cols-4 gap-6">
          {isLoading ? Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} />
          )) : data && data.map((service, index) => (
            <CardService key={service.id ?? index} post={service} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;
