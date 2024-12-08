"use client";

import React from 'react';
// import { useTools } from '@/actions/queries';
// import CustomPagination from '@/components/CustomPagination';
// import { usePageIndex } from '@/lib/pageIndex';
// import CardTool from '@/components/Card/CardTool';
import PageLayout from '@/Providers/PageLayout';

const ToolsPage = () => {
    // Specify the base route dynamically
    // const { pageIndex, changePage } = usePageIndex('/tools', 1); // '/tools' can be changed based on the specific page
    // const { data, isLoading } = useTools(`current-page=${pageIndex}&per-page=15`);

  return (
    <PageLayout 
        title="AI Tools"
        breadcrumbs={[
            { label: 'Home', slug: '/' },
            { label: 'Tools', slug: '/tools' },
        ]}
    >
         
      <div className="container pb-[100px] space-y-10">
        <div className="grid grid-cols-3 gap-6">
          {/* {isLoading ? ".... loading" : 
            data && data.map((tool, index) => (
              <CardTool key={index} post={tool} />
            ))
          } */}
        </div>
        
      </div>
    </PageLayout>
  )
}

export default ToolsPage
