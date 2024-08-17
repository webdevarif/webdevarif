// CardProject.tsx

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { GoArrowUpRight } from 'react-icons/go';
import { Button } from '@/components/ui/button';

interface Project {
  category: string; 
  thumbnails: any; 
  name: string;
  link: string;
}

interface CardProjectProps {
  project: Project;
}

const CardProject: React.FC<CardProjectProps> = ({ project }) => {
  return (
    <div className='card-project-item space-y-6'>
      <div className="rounded-xl overflow-hidden h-[30vh] min-h-[300px]">
        <Image src={project.thumbnails} alt={project.name} className='h-full w-full object-cover' />
      </div>
      <div className="flex gap-3 justify-between items-center">
        <h2 className="mb-0 text-xl font-kanit">{project.name}</h2>
        <Button variant={'ghost'} size={'icon'} asChild>
          <Link href={project.link} className='border !rounded-full hover:bg-primary hover:text-background hover:border-primary'>
            <GoArrowUpRight />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default CardProject;
