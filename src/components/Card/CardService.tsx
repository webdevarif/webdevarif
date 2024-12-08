// CardProject.tsx
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { ServicePostProps } from '@/types/services';
import { Card, CardContent } from '../ui/card';
import { BsChevronRight } from "react-icons/bs";


const CardService: React.FC<{ post: ServicePostProps }> = ({ post }) => {
  return (
    <Card className='rounded-[1.5rem] group/item bg-[linear-gradient(-130deg,rgb(var(--white-rgb))_20%,rgb(var(--background-rgb))_100%)] border-2 border-background text-foreground hover:border-dark duration-150 transition-all ease-linear shadow-sm'>
      <CardContent className='px-8 py-[4rem]'>
          {post.icon && <div className="service-icon mb-8"> <Image src={post.icon} width={65} height={65} alt={ post.title }/></div>}
          { post.title && <Link href={`/services/${post.slug}`}><h3 className="text-2xl font-semibold text-black mb-3">{ post.title }</h3></Link> }
          { post.excerpt && <div className="text-sm mb-6 leading-[1.6]">{ post.excerpt }</div> }
          { post.slug && <div className="mt-auto">
            <Link href={`/services/${post.slug}`} className='text-dark font-semibold inline-flex duration-200 transition-all ease-linear group-hover/item:ms-10 ms-7 items-center text-sm gap-x-4'>
              <span className="border border-dark rounded-full inline-block inline-flex w-6 h-6 items-center justify-center relative before:w-10 before:h-[1px] before:content-[''] before:bg-dark before:absolute before:end-2 before:top-2/4 before:-translate-y-2/4">
                <BsChevronRight className='w-3 h-3'/>
              </span>
              <span>Read More</span>
            </Link>  
          </div> }
      </CardContent>
    </Card>
  );
};

export default CardService;
