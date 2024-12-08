"use client";

import { useBlogs } from '@/actions/queries';
import CardBlogPost from '@/components/Card/CardBlogPost';
import React from 'react';
import Skeleton from './Skeleton';
import SectionHeading from '@/components/Common/SectionHeading';

const BlogInsight = () => {
  const [pageSize] = React.useState<number>(4);
  const { data, isLoading } = useBlogs(`per-page=${pageSize}`);
  return (
    <section className='py-[100px]'>
      <div className="container">
        <SectionHeading 
          title={'Latest Post'} 
          description={'Discover our most recent business insights'}
        />
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          { isLoading ? <Skeleton /> : data && data.posts.map(post => <CardBlogPost key={post.id} post={post} />)}
        </div>
      </div>
    </section>
  );
}

export default BlogInsight;
