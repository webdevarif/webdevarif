"use client";

import React, { Suspense } from 'react';
import { useBlogs } from '@/actions/queries';
import CustomPagination from '@/components/CustomPagination';
import PageLayout from '@/Providers/PageLayout';
import CardBlogPost from '@/components/Card/CardBlogPost';
import Skeleton from './Skeleton';
import { usePageIndex } from '@/lib/pageIndex';
import PrimaryLayout from '@/Providers/PrimaryLayout';
import SectionHeading from '@/components/Common/SectionHeading';

const BlogContent = () => {
  const [pageSize] = React.useState<number>(15);
  const { pageIndex, changePage } = usePageIndex('/blogs', 1);
  const { data, isLoading } = useBlogs(`current-page=${pageIndex}&per-page=${pageSize}`);
  
  return (
    <>
      <SectionHeading 
        caption={'Blog Insight'}
        title={'Latest Post'} 
      />

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
        { isLoading ? Array.from({ length: pageSize }).map((_, index) => (<Skeleton key={index}/> ))  : data && data.posts.map((blog, index) => ( <CardBlogPost key={blog.id ?? index} post={blog} /> ))}
      </div>
      {data && data.total_pages > 1 && <CustomPagination 
        currentPage={pageIndex} 
        totalPages={Number(data?.total_pages)}
        setPage={changePage}
      />}
    </>
  );
}

const BlogPage = () => {
  return (
    <PrimaryLayout>
      <PageLayout>
        <Suspense fallback={<Skeleton />}>
          <BlogContent />
        </Suspense>
      </PageLayout>
    </PrimaryLayout>
  );
}

export default BlogPage;
