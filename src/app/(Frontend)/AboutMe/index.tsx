
import React from 'react';
import Author from './images/author.png';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { TbHeartHandshake } from "react-icons/tb";

const AboutMe = () => {
  return (
    <section className='bg-slate-50 py-[100px] relative' id='section-about'>
        <div className="container max-w-[60rem]">
            <div className="grid grid-cols-[1fr_18rem] gap-x-8 items-center">
                <div className=''>
                    <h3 className="text-lg font-unbounded uppercase mb-4"> I'm Arif Hossin | Full Stack Developer </h3>
                    <div className="space-y-4">
                        <p>With over 7 years as a Full Stack Developer, I specialize in building user-focused, high-performing websites. At Digital Farmers, I create responsive applications using React, Next.js, and Django, with expertise in Shopify Plus, WooCommerce, and WordPress, enabling tailored solutions that exceed client expectations. My Marketing degree enhances my focus on UX and engagement.</p>
                        <p>With 500+ projects completed on Upwork and Fiverr, I’ve honed skills in e-commerce and theme customization. I’m dedicated to delivering impactful digital experiences that drive results.</p>
                    </div>

                    <div className='mt-6'>
                        
                        <span className="inline-block relative z-10 before:transition-all before:duration-300 before:ease-linear before:content-[''] before:w-full before:h-full before:bg-black before:absolute before:-end-[0.35rem] before:z-[-1] before:translate-y-[0.35rem] hover:before:end-0 hover:before:translate-y-0">
                    <Button variant={'outline'} asChild>
                        <Link href="/schedule" className='inline-flex items-center gap-2 h-[3.25rem] min-w-[10rem] uppercase font-unbounded text-sm'>
                        <span>Hire Me</span>
                        <TbHeartHandshake className='w-5 h-5'/>
                        </Link>
                    </Button>
                    </span>
                    </div>

                </div>
                <div className='bg-white border-2 border-black w-full min-h-[25rem] h-[35vh] relative before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black group/item before:absolute before:z-[-1] before:-end-[0.5rem] before:translate-y-[0.5rem]'>
                    <Image src={Author} alt="Ventix" className='mx-auto h-full w-full object-cover object-[top_center]'/>
                </div>
            </div>
        </div>
    </section>
  )
}

export default AboutMe;