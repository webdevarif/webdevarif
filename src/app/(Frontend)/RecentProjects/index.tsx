"use client";

import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import projects from './data';
import CardProject from '@/components/Card/CardProject';
import Link from 'next/link';
import { GoArrowUpRight } from 'react-icons/go';
import Image from 'next/image';

const RecentProjects = () => {
    const [activeFilter, setActiveFilter] = useState('All');

    const filteredProjects = activeFilter === 'All'
        ? projects
        : projects.filter(project => project.category === activeFilter);

    return (
        <section className='section__recent-project py-[100px] bg-card'>
            <div className="container">
                {/* Heading */}
                <div className="text-center mb-[60px]">
                    <h2 className='text-[40px] font-bold uppercase font-outfit leading-[1.1] mb-[5px]'>Recent Projects</h2>
                    <div className="space-y-[15px] text-white text-opacity-60 mb-[35px]">Empowering people in new a digital journey with my super services</div>
                    <div className="">
                        <ul className="flex flex-wrap gap-x-3 gap-y-2 justify-center">
                            {['All', 'Html/Bootstrap', 'Html/Tailwind', 'React/NextJs', 'WordPress/Elementor', 'Shopify'].map(category => (
                                <li key={category}>
                                    <Button
                                        variant={activeFilter === category ? 'default' : 'outline'}
                                        className={`border border-primary border-opacity-100 cursor-pointer ${activeFilter === category ? '' : 'hover:bg-primary hover:text-white'
                                            }`}
                                        onClick={() => setActiveFilter(category)}
                                    >
                                        {category}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {/* Lists */}
                <div className="grid grid-cols-3 gap-y-[60px] gap-x-[30px]">
                    {filteredProjects.map((project, index) => (
                        <CardProject key={index} project={project} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RecentProjects;
