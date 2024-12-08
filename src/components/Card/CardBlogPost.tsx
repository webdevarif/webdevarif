import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { PostDataProps } from '@/types/post';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Config } from '@/lib/config';

const CardBlogPost: React.FC<{ post: PostDataProps }> = ({ post }) => {
  
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      name: post.title,
      image: post.featured_image ?? '',
      categories: post.categories,
      tags: post.tags,
      export: post.excerpt,
      description: post.content,
      date: post.date,
    }
    
  return (
    <Card className='h-full group/item relative flex flex-col bg-transparent shadow-none'>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {post.featured_image && (
        <Link href={Config.cleanBlogURL(post.link)} className="w-full h-[25vh] mb-4 overflow-hidden rounded-xl">
          <Image className='w-full h-full group-hover/item:scale-105 duration-300 transition-all ease-linear object-cover rounded-none' alt={post.title || ''} src={post.featured_image} width={400} height={300} />
      </Link>
      )}
      <CardHeader className='p-0 mb-2'>
        <div className="flex items-center flex-wrap">
          <div className="inline-flex flex-wrap items-center space-x-2">
            {  post.categories && post.categories.map((item, index) =>(
              <Link href="/" key={item.term_id ?? index} className="px-[15px] py-[5px] font-medium rounded-full text-sm bg-dark text-dark-foreground">{item.name}</Link>
            )) }
          </div>
        </div>
        <Link href={Config.cleanBlogURL(post.link)} className='text-black hover:underline transition-all duration-300 hover:text-primary'>
          <h2 className="text-xl leading-[1.4] font-semibold font-source-serif-4 mb-0">{post.title}</h2>
        </Link>
      </CardHeader>
      <CardContent className='space-y-3 mb-4 p-0 text-foreground'>
        <div>{post.excerpt}</div>
      </CardContent>
    </Card>
  );
};

export default CardBlogPost;
