import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Config } from '@/lib/config';
import { MdDoubleArrow } from 'react-icons/md';
import { ToolPostProps } from '@/types/tools';

const CardTool: React.FC<{ post: ToolPostProps }> = ({ post }) => {
  
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Tool',
      name: post.title,
      image: post.featured_image ?? '',
      tags: post.tags,
      export: post.excerpt,
      description: post.content,
      date: post.date,
    }
    
  return (
    <Card className='h-full group/item relative flex flex-col border border-input/60 rounded-2xl'>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {post.featured_image && (
        <div className="w-full h-[15rem] overflow-hidden rounded-t-2xl">
          <Image className='w-full h-full group-hover/item:scale-105 duration-300 transition-all ease-linear object-cover' alt={post.title || ''} src={post.featured_image} width={400} height={300} />
      </div>
      )}
      <CardHeader>
        <Link href={Config.cleanBlogURL(post.link)} className='text-black transition-all duration-300 hover:text-primary'>
          <h2 className="text-xl font-medium mb-0">{post.title}</h2>
        </Link>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div>{post.excerpt}</div>
      </CardContent>
      <CardFooter className='mt-auto border-t border-black pt-5'>
        <Button variant={'link'} asChild className='p-0 text-slate-black hover:text-primary h-auto inline-flex items-center gap-1 uppercase'>
          <Link href={Config.cleanURL(post.link)}>
            <span>Read More</span>
            <MdDoubleArrow />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CardTool;
