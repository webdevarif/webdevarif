'use client';
import { usePricing } from '@/actions/queries';
import CardPricing from '@/components/Card/CardPricing';
import SectionHeading from '@/components/Common/SectionHeading';
import React from 'react'
import Skeleton from './Skeleton';

const Pricing = () => {
  const [pageSize] = React.useState<number>(6);
  const { data, isLoading } = usePricing(`per-page=${pageSize}`);

  console.log("data", data);

  return (
    <section className='bg-white/50 py-[6rem]'>
      <div className="container">
        <SectionHeading caption={"Pricing"} title={'The best pricing plans to get your best'}/>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-8">
          { isLoading ? Array.from({ length: pageSize }).map((_, index) => <Skeleton key={index} /> ) : data?.map((post, index) =>(<CardPricing post={post} key={index} />))}
        </div>

      </div>
    </section>
  )
}

export default Pricing;
