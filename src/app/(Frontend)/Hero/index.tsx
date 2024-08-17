import React from 'react';
import Hand from './images/hand.png';
import Author from './images/author.png';
import Laptop from './images/laptop.png';
import OverlayBG from './images/overlay-bg.png';
import Figma from './images/figma.png';
import WP from './images/wordpress.png';
import Image from 'next/image';
import Link from 'next/link';

const Hero = () => {
  return (
    <section className='section__hero py-[120px] relative before:absolute before:content-[""] before:start-1/2 before:bg-[linear-gradient(to_right,rgba(255,255,255,0),hsl(var(--primary)),rgba(255,255,255,0))] before:bottom-0 before:-translate-x-1/2 before:w-full before:h-[1px] before:max-w-[1360px] before:mx-auto'>
        <div className="container">
            <div className="grid grid-cols-[7fr_5fr] gap-x-[70px] items-center">
                <div className=''>
                    <h1 className='text-[80px] font-semibold leading-[1.1] mb-[20px] font-kanit'><span className='font-outfit font-[200]'>Hey <Image src={Hand} alt='hand' className='animation-hand inline-block' />,</span> I'm <br />
                        ARIF HOSSIN
                    </h1>
                    <div className='mb-[50px] text-[18px] font-normal text-white/75 max-w-[450px]'> 7+ years of Experience | Full Stack Developer, WordPress, WooCommerce, ReactJs, NextJs and Shopify.</div>

                    <div className="grid grid-cols-3 gap-y-3 gap-x-[15px] max-w-[600px]">
                        {/* Item */}
                        <Link href={'/'} className="cursor-hover border border-dashed border-white border-opacity-10 p-[25px] rounded-[10px] bg-center bg-cover text-center flex flex-col gap-y-[30px]" style={{ backgroundImage: `url('${OverlayBG.src}')`}}>
                            <h2 className="text-[20px] uppercase font-normal tracking-[1px] font-kanit">SERVICE</h2>
                            <div className="h-auto-min-h-auto max-h-[inherit] border border-white/20 border-solid mt-[15px] rounded-full overflow-hidden">
                                <Image src={Figma} alt='Figma' className='w-[44px] mx-[5px] my-[10px] max-w-full inline-block' />
                                <Image src={WP} alt='WordPress' className='w-[44px] mx-[5px] my-[10px] max-w-full inline-block' />
                            </div>
                        </Link>
                        {/* Item */}
                        <Link href={'/'} className="cursor-hover border border-dashed border-white border-opacity-10 p-[25px] rounded-[10px] bg-center bg-cover text-center flex flex-col gap-y-[30px]" style={{ backgroundImage: `url('${OverlayBG.src}')`}}>
                            <h2 className="text-[20px] uppercase font-normal tracking-[1px] font-kanit">Projects</h2>
                            <div>
                                <Image src={Laptop} alt='Laptop' />
                            </div>
                        </Link>
                        {/* About */}
                        <Link href={'/'} className="cursor-hover border border-dashed border-white border-opacity-10 p-[25px] rounded-[10px] bg-center bg-cover text-center flex flex-col gap-y-[30px]" style={{ backgroundImage: `url('${OverlayBG.src}')`}}>
                            <h2 className="text-[20px] uppercase font-normal tracking-[1px] font-kanit">About</h2>
                            <div className='font-medium text-[100px] text-primary uppercase leading-[0.5]'>A</div>
                        </Link>
                    </div>
                </div>
                <div>
                    <div className={`hero__author text-center h-auto min-h-auto rounded-[10px] relative z-[1] before:absolute before:bottom-0 before:start-1/2 before:-translate-x-1/2 before:content-[''] before:h-[450px] before:w-[450px] before:bg-[#313552] before:bg-opacity-10 before:-z-[1] before:rounded-[10px] before:shadow-[0px_10px_51px_rgba(0,0,0,0.05)] after:content-[''] after:absolute after:start-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-full after:w-[95%] after:bg-contain after:bg-no-repeat after:bg-center after:-z-[1] after:m-0 after:mt-[11%] ` }>
                        <div className="px-[40px]">
                            <Image src={Author} alt="Ventix" className='mx-auto'/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Hero