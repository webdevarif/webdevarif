"use client";

import { useBlogs } from '@/actions/queries';
import CustomPagination from '@/components/CustomPagination';
import PageLayout from '@/layouts/PageLayout';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CardBlogPost from '@/components/Card/CardBlogPost';

const BlogPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pageIndex, setPageIndex] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam) : 1;
  });
  
  const { data, isLoading } = useBlogs(`current-page=${pageIndex}&per-page=15`);

  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam && pageParam !== pageIndex.toString()) {
      setPageIndex(parseInt(pageParam));
    }
  }, [searchParams, pageIndex]);

  const changePage = (newPage: number) => {
    setPageIndex(newPage);
    
    const searchParams = new URLSearchParams();
    searchParams.set('page', newPage.toString());
  
    router.push(`/blogs?${searchParams.toString()}`);
  };
  
  return (
    <PageLayout>
      {/* Heading */}
      <div className="py-[100px] text-center">
          <div className="container">
              <h5 className="font-unbounded text-5xl font-semibold uppercase">Blog Insight</h5>
          </div>
      </div> 
      <div className="container pb-[100px] space-y-10">
        <div className="grid grid-cols-3 gap-6">
          {isLoading ? "Loading..." : 
            data && data.blogs.map((blog, index) => (
              <CardBlogPost key={blog.id ?? index} post={blog} />
            ))
          }
        </div>

        {data && data.total_pages > 1 && 
          <CustomPagination 
            currentPage={pageIndex} 
            totalPages={Number(data?.total_pages)}
            setPage={changePage}
          />
        }
      </div>
    </PageLayout>
  );
}

export default BlogPage;
