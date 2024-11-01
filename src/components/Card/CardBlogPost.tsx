import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { BlogPostsProps } from '@/types/blogs';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Config } from '@/lib/config';
import { MdDoubleArrow } from 'react-icons/md';

const CardBlogPost: React.FC<{ post: BlogPostsProps }> = ({ post }) => {
  return (
    <Card className='h-full group/item relative flex flex-col border border-black before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]'>
      {post.featured_image && (
        <div className="w-full h-[15rem] overflow-hidden">
          <Image className='w-full h-full group-hover/item:scale-105 duration-300 transition-all ease-linear object-cover rounded-none' alt={post.title || ''} src={post.featured_image} width={400} height={300} />
      </div>
      )}
      <CardHeader>
        <Link href={Config.cleanBlogURL(post.link)} className='text-black transition-all duration-300 hover:text-primary'>
          <h2 className="font-unbounded text-sm leading-[1.6] font-medium mb-0">{post.title}</h2>
        </Link>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div>{post.excerpt}</div>
      </CardContent>
      <CardFooter className='mt-auto border-t border-black pt-5'>
        <Button variant={'link'} asChild className='p-0 text-slate-black hover:text-primary h-auto inline-flex items-center gap-1 uppercase'>
          <Link href={Config.cleanBlogURL(post.link)}>
            <span>Read More</span>
            <MdDoubleArrow />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CardBlogPost;
