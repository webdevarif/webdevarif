"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Hand from './images/hand.png';
import { Button } from '@/components/ui/button';
import { GoArrowUpRight } from "react-icons/go";
import { RiFacebookFill, RiInstagramLine, RiLinkedinFill } from "react-icons/ri";
import { TypeAnimation } from 'react-type-animation';
import AuthorImage from './images/author.png';
import AuthorShape from './images/author-bg-shape.svg';

const Hero = () => {
  return (
    <section className="xl:min-h-[95vh] w-full pt-[10rem] pb-[4rem] flex flex-col justify-center relative before:content-[unset] md:before:content-[''] before:h-[calc(100%-5rem)] before:w-[1px] before:bg-dark before:absolute before:bottom-[2rem] before:start-2/4 before:-translate-x-2/4">
        <div className="container">
            <div className="grid items-center md:grid-cols-2 gap-y-[50px] gap-x-[100px] xl:gap-x-[200px]">
                <div className="grid__item md:order-last">
                    <div className="relative max-w-[35rem]">
                        <Image src={AuthorImage} alt='Author' className='w-[25rem] max-w-[80%] mx-auto'/>
                        <Image src={AuthorShape} alt='Author Bg Shape' className='w-[35rem] max-w-[95%] absolute mx-auto bottom-0 start-2/4 -translate-x-2/4 -z-[1]'/>
                        <span className="bg-[#618F3C] font-barlow text-dark-foreground dark:text-black border-[#fff] px-8 py-3 text-md font-medium uppercase border shadow-sm rounded-full absolute -start-[0%] bottom-[20%]">Shopify Expert</span>
                        <span className="bg-[#7F54B3]  font-barlow dark:text-black text-dark-foreground border-[#fff] px-8 py-3 text-md font-medium uppercase border shadow-sm rounded-full absolute end-2 lg:-end-[5%] bottom-[45%]">WooCommerce</span>
                    </div>
                </div>
                <div className="grid__item">
                    <h2 className="text-4xl lg:text-6xl leading-[1] mb-[0.5rem] lg:mb-[0.75rem] font-bold text-dark ">Hi <Image src={Hand} className='h-[3.5rem] w-auto inline-block align-middle' alt='hand icon'/> I&apos;M ARIF</h2>
                    <TypeAnimation
                        sequence={[
                            'Frontend Developer', // Types 'One'
                            1000, // Waits 1s
                            'NextJs/React Developer', // Deletes 'One' and types 'Two'
                            2000, // Waits 2s
                            'WooCommerce Expert', // Types 'Three' without deleting 'Two'
                            2000, // Waits 2s
                            'Shopify Expert', // Types 'Three' without deleting 'Two'
                            2000, // Waits 2s
                            () => {
                            console.log('Sequence completed');
                            },
                        ]}
                        wrapper="span"
                        cursor={true}
                        repeat={Infinity}
                        className='text-dark text-lg md:text-xl lg:text-3xl leading-[1.2] font-medium mb-[1rem] lg:mb-[1.5rem] inline-block rounded-lg border border-dark py-2 px-4'
                    />
                        
                    <div className="text-lg leading-[1.6] mb-[1.5rem] lg:mb-[3rem]">
                        <p>Hey there! I&apos;m Arif Hossin, I specialize in developing and cloning websites using WordPress and Shopify. Available 24/7 for any web-based issues. Feel free to contact me anytime for high-quality service!</p>
                    </div>

                    <div className="flex gap-x-4 items-center">
                        <Button variant={'primary'} asChild>
                            <Link href={'/'} className='uppercase'>
                                <span>HIRE ME NOW</span>
                                <span><GoArrowUpRight className='h-5 w-5 icon'/></span>
                            </Link>
                        </Button>
                        
                        <div className='inline-flex gap-2 items-center'>
                            <Link href={'https://www.facebook.com/webdeveloperarif'} target='_blank' className="text-dark transition-all duration-150 ease-linear bg-card hover:bg-dark hover:text-dark-foreground w-12 h-12 shadow-[linear-gradient(0deg,var(--dark-foreground-rgb)_0%,rgb(var(--background-rgb))_100%)] rounded-full items-center justify-center inline-flex">
                                <RiFacebookFill className='w-5 h-5'/>
                            </Link>
                            <Link href={'https://www.linkedin.com/in/arif-hossin'} target='_blank' className="text-dark transition-all duration-150 ease-linear bg-card hover:bg-dark hover:text-dark-foreground w-12 h-12 shadow-[linear-gradient(0deg,var(--dark-foreground-rgb)_0%,rgb(var(--background-rgb))_100%)] rounded-full items-center justify-center inline-flex">
                                <RiLinkedinFill className='w-5 h-5'/>
                            </Link>
                            <Link href={'https://www.instagram.com/web_developer_arif/'} target='_blank' className="text-dark transition-all duration-150 ease-linear bg-card hover:bg-dark hover:text-dark-foreground w-12 h-12 shadow-[linear-gradient(0deg,var(--dark-foreground-rgb)_0%,rgb(var(--background-rgb))_100%)] rounded-full items-center justify-center inline-flex">
                                <RiInstagramLine className='w-5 h-5'/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <svg className='absolute hidden md:block -bottom-2 start-2/4 -translate-x-2/4 w-[20rem] max-w-[80%] mx-auto' width="674" height="55" viewBox="0 0 674 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M132.2 23.7938C89.8 22.9938 43.4 24.2938 1 23.5938" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M193.6 21.5C234.4 22.3 279.1 24.5 319.8 27.9" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M213.4 21.1009C213.4 17.7009 210.4 10.9009 207 10.4009C203.7 9.90092 200.3 11.4009 197.9 13.7009C195.5 16.1009 193.9 19.2009 192.6 22.3009C189.9 28.9009 188.3 36.0009 185.1 42.5009C183.6 45.6009 181.6 48.7009 178.8 50.8009C176.1 52.8009 172.3 53.9009 169 52.8009C165.7 51.8009 161.2 48.3009 161.8 44.9009" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M199.7 11.4965C194.6 5.39649 184.4 4.39649 178.2 9.39649C174.1 12.6965 171.9 17.7965 170.4 22.7965C169 27.7965 168.1 32.9965 165.8 37.7965C163.6 42.4965 159.5 46.6965 154.4 47.5965C149.2 48.4965 143.3 44.6965 143.3 39.3965" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M182.4 7.49823C179.5 5.49823 176.6 3.49823 173.3 2.39823C169.9 1.19823 166.1 1.09824 163 2.79824C157.6 5.59824 156.2 12.3982 154.4 18.2982C152.1 25.8982 148.1 33.0982 142.8 39.0982C140 42.3982 136.5 45.3982 132.3 46.0982C128 46.7982 123 44.0982 122.7 39.7982" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M161.3 2.39749C156.6 0.297491 148.9 1.79749 144.9 4.89749C140.9 8.09749 138.4 12.6975 136.3 17.3975C134.2 22.0975 132.4 26.8975 129.7 31.1975C127.8 34.0975 125.4 36.7975 122.3 38.2975C119.2 39.7975 115.2 39.8975 112.4 37.9975C109.5 36.0975 106.1 27.8975 107.9 24.8975" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M541.399 23.7938C583.799 22.9938 630.199 24.2938 672.599 23.5938" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M480 21.5C439.2 22.3 394.5 24.5 353.8 27.9" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M460.2 21.1009C460.2 17.7009 463.2 10.9009 466.6 10.4009C469.9 9.90092 473.3 11.4009 475.7 13.7009C478.1 16.1009 479.7 19.2009 481 22.3009C483.7 28.9009 485.3 36.0009 488.5 42.5009C490 45.6009 492 48.7009 494.8 50.8009C497.5 52.8009 501.3 53.9009 504.6 52.8009C507.9 51.8009 512.4 48.3009 511.8 44.9009" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M473.899 11.4965C478.999 5.39649 489.199 4.39649 495.399 9.39649C499.499 12.6965 501.699 17.7965 503.199 22.7965C504.599 27.7965 505.499 32.9965 507.799 37.7965C509.999 42.4965 514.099 46.6965 519.199 47.5965C524.399 48.4965 530.299 44.6965 530.299 39.3965" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M491.2 7.49823C494.1 5.49823 497 3.49823 500.3 2.39823C503.7 1.19823 507.5 1.09824 510.6 2.79824C516 5.59824 517.4 12.3982 519.2 18.2982C521.5 25.8982 525.5 33.0982 530.8 39.0982C533.6 42.3982 537.1 45.3982 541.3 46.0982C545.6 46.7982 550.6 44.0982 550.9 39.7982" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M512.3 2.39749C517 0.297491 524.7 1.79749 528.7 4.89749C532.7 8.09749 535.2 12.6975 537.3 17.3975C539.4 22.0975 541.2 26.8975 543.9 31.1975C545.8 34.0975 548.2 36.7975 551.3 38.2975C554.4 39.7975 558.4 39.8975 561.2 37.9975C564.1 36.0975 567.5 27.8975 565.7 24.8975" stroke="rgb(var(--black-rgb))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M324.113 18.263L334.213 9.76298C335.313 8.76298 337.013 8.76301 338.113 9.66301L348.613 18.263C350.213 19.463 350.113 21.863 348.513 23.063L338.313 31.063C337.213 31.963 335.613 31.963 334.513 31.063L324.213 23.063C322.613 21.863 322.613 19.463 324.113 18.263Z" fill="rgb(var(--black-rgb))"/>
        </svg>
    </section>
  )
}

export default Hero;