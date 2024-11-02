"use client";
import { useBlogPost } from '@/actions/queries';
import PageLayout from '@/layouts/PageLayout'
import Head from 'next/head';
import React from 'react';
import DOMPurify from "dompurify";
import Link from 'next/link';
import { Config } from '@/lib/config';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import Moment from 'react-moment';

const BlogPost = ({
  params,
}: {
  params: { slug: string }
}) => {
  const { data, isLoading } = useBlogPost(`${params.slug}`);

  return data?.post && (
    <PageLayout>
      <Head>
        <title>{data.post.title}</title>
      </Head>
    {/* Heading */}
        <div className="py-6">
            <div className="container">
              <div className="grid grid-cols-3 gap-x-6">
                <div className="col-span-2 space-y-6">
                  <h1 className="font-unbounded text-3xl leading-[1.3] font-semibold uppercase">{data.post.title}</h1>
                  {/* POST DATE */}
                  <div className=""><Moment format='MMMM Do YYYY'>{ data.post.date }</Moment></div>
                  {/* POST THUMBNAIL */}
                  {data.post.featured_image && <div className=""><Image src={ data.post.featured_image } alt={data.post.title} width={800} height={450} /></div>}

                  {/* SHARE ICONS */}
                  <div className="">SHARE ICONS</div>
                  {/* TABLE OF CONTENT */}
                  <div className="">TABLE OF CONTENT</div>
                  {/* POST CONTENT */}
                    <div className='post-content' dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(data.post.content ?? '')}}></div>
                </div>
                <div className="col-span-1">
                  <div className="sticky top-[100px]">
                      <Card className='relative flex flex-col border border-black before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]'>
                        <CardHeader className='border-b border-black'>
                          <h2 className="font-unbounded text-lg leading-[1.3] mb-0 font-semibold uppercase">Related Posts</h2>
                        </CardHeader>
                        <CardContent className='pt-4'>
                          <ul className='space-y-3'>
                            {data.related_posts && data.related_posts.map((post, index) => (
                              <li key={index}><Link className='font-hind font-medium hover:text-primary transition-all duration-300 ease-linear text-sm' href={Config.cleanBlogURL(post.link)} >{ post.title }</Link></li>
                            ))}
                          </ul>                          
                        </CardContent>
                      </Card>
                    </div>
                </div>
              </div>
            </div>
        </div>
    </PageLayout>
  )
}

export default BlogPost;