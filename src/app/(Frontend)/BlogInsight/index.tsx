"use client";

import { useBlogs } from '@/actions/queries';
import CardBlogPost from '@/components/Card/CardBlogPost';
import React from 'react';

const BlogInsight = () => {
  const { data, isLoading } = useBlogs(`current-page=1&per-page=3`);

  return (
    <section className='py-[100px]'>
      <div className="container">
        <div className="mb-[3rem] mx-auto text-center max-w-[40rem]">
          <span className="uppercase font-unbounded font-bold text-4xl mb-3 inline-block">Blog Insight</span>
          <p className="font-medium">Valuable insights to change your startup idea</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            data && data.blogs.map(blog => (
              <CardBlogPost key={blog.id} post={blog} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default BlogInsight;
