"use client";
import React from 'react';
import CardProject from '@/components/Card/CardProject';
import { projectQueries } from '@/actions/queries';

const Projects = () => {
    const { data, isLoading } = projectQueries.getPosts(`current-page=1&per-page=3`);
  return (
    <section className="py-[100px]">
        <div className="container">
            <div className="mb-[3rem] mx-auto text-center max-w-[40rem]">
            <span className="uppercase font-unbounded font-bold text-4xl mb-3 inline-block">Recent Projects</span>
            <p className="font-medium">Valuable insights to change your startup idea</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {isLoading ? (
                    <p>Loading...</p>
                ) : (
                    data && data.projects.map(project => (
                        <CardProject key={project.id} post={ project } />
                    ))
                )}
                </div>
        </div>
    </section>
  )
}

export default Projects;