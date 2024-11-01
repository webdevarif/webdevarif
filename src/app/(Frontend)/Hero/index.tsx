import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageLayout from '@/layouts/PageLayout';
import ShapeBG from './images/hero-shape.svg';
import HeroService1 from './images/hero-service-1.png';
import HeroService2 from './images/hero-service-2.png';
import DevArif from './images/web-developer-arif.jpg';
import { Button } from '@/components/ui/button';
import { HiChevronDoubleDown } from "react-icons/hi2";

const Hero = () => {
  return (
    <PageLayout>
        <section className="hero-banner pt-[30px] pb-[100px]">
            <div className="container">
                <div className="bg-black text-white rounded-3xl p-6 grid grid-cols-3 gap-6">
                    <div className="">
                        <Image src={HeroService1} alt="Service 1" className='rounded-2xl'/>
                    </div>
                    <div className='text-center flex flex-col justify-center'>
                        <div className='inline-block mb-8 relative w-[6rem] h-[6rem] mx-auto z-10
                        before:content-[""] before:bg-white/50 before:absolute before:z-0 before:-translate-x-2/4 before:-translate-y-2/4 before:block before:w-20 before:h-20 before:animate-[pulse-border_1500ms_ease-out_infinite] before:rounded-[50%] before:left-2/4 before:top-2/4
                        '>
                            <Image src={DevArif} alt="Developer Arif" className='rounded-full w-full h-full object-cover object-center relative z-10'/>
                            <span className=""></span>

                        </div>
                        <h3 className="font-optima-pro font-normal text-xl mb-3 uppercase">Arif Hossin</h3>
                        <h2 className="text-4xl leading-[1.3] uppercase font-unbounded font-bold">Thinking for Creativity</h2>
                    </div>
                    <div className="">
                        <Image src={HeroService2} alt="Service 2" className='rounded-2xl'/>
                    </div>
                </div>
                <div className="text-center grid grid-cols-3 gap-6">
                    <div></div>
                    <div className="relative">
                        <Image src={ShapeBG} alt="hero shape" className="max-w-full h-auto pointer-events-none"/>
                        <Button variant={'ghost'} asChild>
                            <Link href="#section-about" className='inline-flex uppercase transition-all duration-150 p-2 hover:bg-transparent hover:text-white h-auto gap-2 flex-col absolute top-2 text-white start-2/4 -translate-x-2/4'>
                                <span>Scroll Down</span>
                                <span className='mt-4 border-2 border-white/15 inline-flex w-8 h-14 items-center justify-center rounded-full'>
                                    <HiChevronDoubleDown className='scroller-animation'/>
                                </span>
                            </Link>
                        </Button>
                    </div>
                    <div></div>
                </div>
                <div className="text-center uppercase grid grid-cols-4 gap-0 px-8 pt-5">
                    {/* ITEM */}
                    <div className='-mt-[5rem]'>
                        <div className="relative h-[8rem] flex flex-col justify-center">
                            <span className="absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 end-0 border-t-2 border-r-2 border-black rounded-tr-[1.75rem] 
                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-l-2 before:rounded-bl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-top-[3rem]
                            "></span>
                            <span className="absolute w-[calc(100%-2.5rem)] h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-l-2 border-black rounded-bl-[1.75rem]
                            
                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-t-2 before:border-black before:border-r-2 before:rounded-tr-[1.75rem] before:-end-[calc(2.5rem+2px)] before:-bottom-[3rem]
                            "></span>
                            <h3 className="text-5xl mb-3 font-hind font-bold">320+</h3>
                            <p className='font-unbounded text-black/50 font-semibold text-xs'>Happy Customer</p>
                        </div>
                    </div>
                    {/* ITEM */}
                    <div className='mt-[3rem]'>
                        <div className="relative h-[8rem] flex flex-col justify-center">
                            <span className="absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 end-0 border-t-2 border-black 
                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-l-2 before:rounded-bl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-top-[3rem]"></span>
                            <span className="absolute w-[calc(100%+2.5rem)] h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-l-2 border-black rounded-bl-[1.75rem]"></span>
                            <h3 className="text-5xl mb-3 font-hind font-bold">1k+</h3>
                            <p className='font-unbounded text-black/50 font-semibold text-xs'>Complete Projects</p>
                        </div>
                    </div>
                    {/* ITEM */}
                    <div className='mt-[3rem]'>
                        <div className="relative h-[8rem] flex flex-col justify-center">
                            <span className="absolute w-full h-[calc(100%-2.5rem)] top-0 end-[2.5rem] border-t-2 border-black"></span>
                            <span className="absolute w-full h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-black border-r-2 rounded-br-[1.75rem]
                            after:absolute after:content-[''] after:w-[2px] after:h-[calc(100%-1.5rem)]  after:bg-black after:start-[2px] after:bottom-[1.5rem]
                            before:absolute before:content-[''] before:w-[2.5rem] before:h-[3rem] before:border-b-2 before:border-black before:border-r-2 before:rounded-br-[1.75rem] before:-end-[4px] before:-top-[calc(4.5rem-2px)]
                            "></span>
                            <h3 className="text-5xl mb-3 font-hind font-bold">3+</h3>
                            <p className='font-unbounded text-black/50 font-semibold text-xs'>Awards</p>
                        </div>
                    </div>
                    {/* ITEM */}
                    <div className='-mt-[5rem]'>
                        <div className="relative h-[8rem] flex flex-col justify-center">
                            <span className="absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 -start-[2px] border-t-2 border-l-2 border-black rounded-tl-[1.75rem] 
                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-r-2 before:rounded-br-[1.75rem] before:-end-[calc(2.5rem+2px)] before:-top-[3rem]
                            "></span>
                            <span className="absolute w-[calc(100%-2.5rem)] h-[calc(100%-1.5rem)] bottom-0 end-[2px] border-b-2 border-r-2 border-black rounded-br-[1.75rem]
                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-t-2 before:border-black before:border-l-2 before:rounded-tl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-bottom-[3rem]
                            "></span>
                            <h3 className="text-5xl mb-3 font-hind font-bold">89%</h3>
                            <p className='font-unbounded text-black/50 font-semibold text-xs'>Growing</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </PageLayout>
  )
}

export default Hero