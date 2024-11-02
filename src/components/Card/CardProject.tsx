// CardProject.tsx

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ProjectPostProps } from '@/types/projects';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Config } from '@/lib/config';
import { MdDoubleArrow } from 'react-icons/md';


const CardProject: React.FC<{ post: ProjectPostProps }> = ({ post }) => {
  return (
    <Card className='h-full relative flex flex-col border border-black before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black group/item before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]'>
      {post.featured_image && (
          <Link href={post.preview_link} className="block w-full h-[15rem] overflow-hidden">
            <Image className='w-full h-full group-hover/item:object-[0%_100%] duration-5000 transition-all ease-linear object-cover object-[0%_0%] rounded-none' alt={post.title || ''} src={post.featured_image} width={400} height={300} />
        </Link>
      )}
      <CardHeader>
        <Link href={post.preview_link} className='text-black transition-all duration-300 hover:text-primary'>
          <h2 className="font-unbounded text-sm leading-[1.6] font-medium mb-0">{post.title}</h2>
        </Link>
      </CardHeader>
      <CardContent className='space-y-3'>
        { post.excerpt && <div>{post.excerpt}</div>}

        {post.project_categories && <div className='inline-flex gap-2'>
          { post.project_categories && post.project_categories.map((category, index) => {
            // Return something for each category
            return (
              <span key={index} className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${Config.projectCategoryClass(category.name)}`}>
                {category.name}
              </span>
            );
          })}
        </div>}
      </CardContent>
      <CardFooter className='mt-auto border-t border-black pt-5'>
        <Button variant={'link'} asChild className='p-0 text-slate-black hover:text-primary h-auto inline-flex items-center gap-1 uppercase'>
          <Link href={post.preview_link}>
            <span>Preview</span>
            <MdDoubleArrow />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CardProject;
