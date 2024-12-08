'use client';
import PageLayout from '@/Providers/PageLayout'
import PrimaryLayout from '@/Providers/PrimaryLayout'
import { usePricing } from '@/actions/queries'
import CardPricing from '@/components/Card/CardPricing';
import SectionHeading from '@/components/Common/SectionHeading';
import React from 'react'
import Skeleton from './Skeleton';

const PricingPage = () => {
  const [pageSize] = React.useState<number>(12);
    const { data, isLoading } = usePricing(`per-page=${pageSize}`);
  return (
    <PrimaryLayout>
        <PageLayout>
            <SectionHeading caption={'Pricing'} title="The best pricing plans to get your best" />
            <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-8">
            { isLoading ? Array.from({ length: pageSize }).map((_, index) => <Skeleton key={index} /> ) : data?.map((post, index) =>(<CardPricing post={post} key={index} />))}
            </div>
        </PageLayout>
    </PrimaryLayout>
  )
}

export default PricingPage
