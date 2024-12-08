// CardProject.tsx

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { ProjectPostProps } from '@/types/projects';
import { Card, CardContent } from '../ui/card';
import { BsChevronRight } from 'react-icons/bs';


const CardProject: React.FC<{ post: ProjectPostProps }> = ({ post }) => {
  return (
    <Card className='rounded-xl group/item bg-white text-foreground duration-150 transition-all ease-linear shadow-sm'>
      <div className="p-4">
        {post.featured_image && ( <Link href={post.preview_link} className="block border border-background rounded-lg w-full min-h-[16rem] h-[35vh] overflow-hidden mb-2" target='_blank'><Image className='w-full h-full group-hover/item:object-[0%_100%] duration-5000 transition-all ease-linear object-cover object-[0%_0%] rounded-none' alt={post.title || ''} src={post.featured_image} width={400} height={300} /></Link>)}
      </div>
      <CardContent className='px-8 space-y-3'>
          <div className="inline-flex flex-wrap items-center space-x-1">
              {  post.categories && post.categories.map((item, index) =>(
                <span key={item.term_id ?? index} className="px-[15px] mt-1 py-[5px] font-semibold uppercase rounded-full text-xs bg-white text-black border">{item.name}</span>
              )) }
          </div>
          <div className="">
            <Link href={post.preview_link} className='text-black transition-all duration-300 hover:text-primary' target='_blank'>
              <h2 className="text-2xl leading-[1.6] font-semibold mb-0">{post.title}</h2>
            </Link>
          </div>
          { post.preview_link && <div className="mt-auto">
            <Link href={`${post.preview_link}`} className='text-dark font-semibold inline-flex duration-200 transition-all ease-linear group-hover/item:ms-10 ms-7 items-center text-sm gap-x-4'>
              <span className="border border-dark rounded-full inline-block inline-flex w-6 h-6 items-center justify-center relative before:w-10 before:h-[1px] before:content-[''] before:bg-dark before:absolute before:end-2 before:top-2/4 before:-translate-y-2/4">
                <BsChevronRight className='w-3 h-3'/>
              </span>
              <span>Preview</span>
            </Link>  
          </div> }
      </CardContent>
    </Card>
  );
};

export default CardProject;
