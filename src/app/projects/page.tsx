"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjects } from '@/actions/queries';
import CustomPagination from '@/components/CustomPagination';
import PageLayout from '@/Providers/PageLayout';
import PrimaryLayout from '@/Providers/PrimaryLayout';
import SectionHeading from '@/components/Common/SectionHeading';
import CardProject from '@/components/Card/CardProject';
import Skeleton from './Skeleton';

const ProjectContent = () => {
  const [pageSize] = useState<number>(12);
  const router = useRouter();
  const searchParams = useSearchParams();

  const getPageFromParams = () => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam) : 1;
  };

  const [pageIndex, setPageIndex] = useState(getPageFromParams);

  const { data, isLoading } = useProjects(`current-page=${pageIndex}&per-page=${pageSize}`);

  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam && pageParam !== pageIndex.toString()) {
      setPageIndex(parseInt(pageParam));
    }
  }, [searchParams, pageIndex]);

  const changePage = (newPage: number) => {
    setPageIndex(newPage);
    
    // Construct the new URL with updated parameters
    const newUrl = `/projects?page=${newPage}`;
    
    // Update the URL without reloading the page
    router.replace(newUrl);
  };
  
  return (
    <PageLayout>
      <SectionHeading caption={'Portfolio'} title={'My Recent Work'} />
      
      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-8">
        {isLoading 
          ? Array.from({ length: pageSize }).map((_, index) => <Skeleton key={index} />)
          : data && data.posts.map((project, index) => (
              <CardProject key={project.id ?? index} post={project} />
            ))}
      </div>
      {data && data.total_pages > 1 && (
        <CustomPagination 
          currentPage={pageIndex} 
          totalPages={data.total_pages}
          setPage={changePage}
        />
      )}
    </PageLayout>
  );
};

const ProjectsPage = () => {
  return (
    <PrimaryLayout>
      {/* Wrap only the dynamic content in Suspense */}
      <Suspense fallback={<Skeleton />}>
        <ProjectContent />
      </Suspense>
    </PrimaryLayout>
  );
};

export default ProjectsPage;
