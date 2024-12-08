"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useBlogPost } from '@/actions/queries';
import PageLayout from '@/Providers/PageLayout';
import Head from 'next/head';
import Notfound from '@/components/Notfound';
import Skeleton from './Skeleton';
import PrimaryLayout from '@/Providers/PrimaryLayout';
import PostData from './PostData';
import Toc from '@/components/Common/Toc';
import { BlogPostsProps } from '@/types/blogs';

const LoadingOrError = ({ isLoading }: { isLoading: boolean }) => (
  <PrimaryLayout>
    <PageLayout>
      <Head>
        <title>{isLoading ? 'Loading...' : 'Post Not Found'}</title>
      </Head>
      {isLoading ? <Skeleton /> : <Notfound />}
    </PageLayout>
  </PrimaryLayout>
);

const BlogPostContent = ({ post }: { post: BlogPostsProps }) => {
  return (
    <PrimaryLayout>
      <PageLayout
        title={post.title}
        banner={post.featured_image}
        breadcrumbs={[ 
          { label: "Home", slug: '/' },
          { label: "Blog", slug: '/blogs' },
          { label: post.slug, slug: '/' }
        ]}
      >
        <Head>
          <title>{post.title}</title>
        </Head>
        <div className="pb-[50px]">
          <div className="container">
            <div className="grid grid-cols-3 gap-x-6">
              <div className="col-span-2 space-y-6">
                  <PostData post={post} />
              </div>
              <div className="col-span-1">
                <Toc />
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </PrimaryLayout>
  )
};

const BlogPost = () => {
  const params = useParams();
  const { data, isLoading } = useBlogPost(params.slug as string);

  if (isLoading || !data?.post) {
    return <LoadingOrError isLoading={isLoading} />;
  }

  return <BlogPostContent post={data.post} />;
};

export default BlogPost;
