// import { Card, CardContent, CardHeader } from '@/components/ui/card'
import PageLayout from '@/Providers/PageLayout';
import React from 'react'

const Loading = () => {
  return (
    <PageLayout>
        <div className="py-[50px]">
            <div className="container">
                <div className="grid grid-cols-3 gap-y-[40px] gap-x-[30px]">
                    <div className="col-span-2 space-y-[1.5rem]">
                        <div className="w-full h-[3rem] animate-pulse bg-card rounded-md"></div>
                        <div className="w-full h-[75vh] animate-pulse bg-card rounded-md"></div>
                    </div>
                    <div className="col-span-1 space-y-[1.5rem]">
                        <div className="w-full h-[40vh] animate-pulse bg-card rounded-md"></div>
                        <div className="w-full h-[40vh] animate-pulse bg-card rounded-md"></div>
                    </div>
                </div>
            </div>
        </div>
    </PageLayout>
  )
}

export default Loading
