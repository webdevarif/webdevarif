'use client';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Heading } from '@/components/Common/Heading';
import Image from 'next/image';

interface Breadcrumb {
  label: string;
  slug: string;
}

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  banner?: string | undefined | null;
  breadcrumbs?: Breadcrumb[];
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, description, banner, breadcrumbs }) => {
  return (
    <div className="pt-[12rem] pb-[3rem]">
      <div className="container">
      {(title || description || banner || (breadcrumbs && breadcrumbs.length > 0)) && (
        <div className="mb-7 text-center">
          <div className="w-full mx-auto space-y-4">
            {title && <Heading as='h1' size='5xl'>{title}</Heading>}
            {description && <div dangerouslySetInnerHTML={{ __html: description }}/>}
            {breadcrumbs &&
              <nav aria-label="breadcrumb">
                <ol className="flex justify-center font-semibold">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      {index === breadcrumbs.length - 1 ? (
                        <span className='line-clamp-1 text-start'>{breadcrumb.label}</span>
                      ) : (
                        <Link href={breadcrumb.slug} className={cn('flex items-center gap-2 duration-200 transition-all ease-linear text-dark hover:text-dark')}>
                            {index === 0 && <HomeIcon className='w-5 h-5' />}
                            <span>{breadcrumb.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>}
              {banner && <div className='pt-4'><Image src={banner} width={1920} height={1080} alt={title ?? ''}/></div>}
          </div>
        </div> )}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
