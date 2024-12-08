"use client";
import React from 'react';
import CardProject from '@/components/Card/CardProject';
import { Button } from '@/components/ui/button';
import SectionHeading from '@/components/Common/SectionHeading';
import { LoadMoreProjects } from '@/lib/fetchData';
import Skeleton from './Skeleton';

const Projects = () => {
    const [pageSize] = React.useState<number>(9);
    const { projects, isLoading, isLoadingMore, changePage, size, isLast } = LoadMoreProjects(`&per-page=${pageSize}`);

    return (
        <section className="py-[100px]">
            <div className="container">
                <SectionHeading caption={'Portfolio'} title={'My Recent Work'} />

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 xl:gap-6">
                { isLoading ? Array.from({ length: pageSize }).map((_, index) => (<Skeleton key={index}/> ))  : projects && projects.map(project => ( <CardProject key={project.id} post={project} /> ))}
                </div>
                {!isLast && <div className="text-center text-md mt-[3rem]">
                    Are you interested to show more portfolios?
                    <Button
                        variant={'outline'}
                        type='button'
                        disabled={isLast || isLoadingMore}
                        className='text-sm text-dark font-semibold ms-4 rounded-full px-6'
                        onClick={() => changePage(size + 1)}>
                        {isLoadingMore ? "Loading..." : "Load More"}
                        </Button>
                </div>}
            </div>
        </section>
    )
}

export default Projects;
