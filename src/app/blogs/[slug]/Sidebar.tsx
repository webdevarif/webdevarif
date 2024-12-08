import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SingleBlogPostProps } from '@/types/blogs';
import Link from 'next/link';
import { Config } from '@/lib/config';

    const Sidebar: React.FC<SingleBlogPostProps> = ({ related_posts, post }) => {
        console.log("POST", post);

  return (
    <div className='sticky top-[7rem] z-10 space-y-6'>
        <Card>
            <CardHeader>
                <div className='text-xl uppercase font-semibold'>
                    <span className="inline-block w-auto pb-2 relative before:content-[''] before:w-[4.5rem] before:h-[2px] before:bg-dark before:absolute before:bottom-0">Related Posts</span>
                </div>
            </CardHeader>
            <CardContent>
                <ul className='space-y-3'>
                    {   related_posts && related_posts.map((post, index) => (
                    <li key={index}><Link href={Config.cleanBlogURL(post.link)} className='font-medium hover:text-primary transition-all duration-300 ease-linear text-sm'>{post.title}</Link></li>
                    ))}
                </ul>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className='text-xl uppercase font-semibold'>
                    <span className="inline-block w-auto pb-2 relative before:content-[''] before:w-[4.5rem] before:h-[2px] before:bg-dark before:absolute before:bottom-0">Tags</span>
                </div>
            </CardHeader>
            <CardContent>
                <ul className='flex flex-wrap gap-2'>
                    { post && post.tags && post.tags.map((tag, index) => (
                    <li key={index}><span className='font-medium hover:text-primary transition-all duration-300 ease-linear text-xs leading-[1.3] border border-card-foreground/10 px-6 py-3 inline-block uppercase rounded-full'>{tag.name}</span></li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    </div>
  )
}

export default Sidebar
