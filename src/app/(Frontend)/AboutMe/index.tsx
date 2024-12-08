
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoArrowUpRight } from 'react-icons/go';
import { FaPlay } from "react-icons/fa6";

import VideoCover from './images/web-developer-arif-banner.webp';
import IconVSCode from './images/icon-vscode.svg';
import IconFIgma from './images/icon-figma.svg';
import IconAdobePS from './images/icon-adobe-photoshop.svg';
import IconAdobeXD from './images/icon-adobe-xd.svg';
import IconGithub from './images/icon-github.svg';
import IconHTML from './images/icon-html.svg';
import IconCSS from './images/icon-css.svg';
import IconSass from './images/icon-sass.svg';
import IconJS from './images/icon-js.svg';
import IconReact from './images/icon-react.svg';
import IconNextJS from './images/icon-nextjs.svg';
import IconTS from './images/icon-typescript.svg';
import IconVite from './images/icon-vite.svg';
import IconShopify from './images/icon-shopify.svg';
import IconJWT from './images/icon-jwt.svg';
import IconPrisma from './images/icon-prisma.svg';
import IconWebpack from './images/icon-webpack.svg';
import IconWP from './images/icon-wp.svg';
import IconWooCommerce from './images/icon-woocommerce.svg';
import IconLiquid from './images/icon-liquid.svg';

const AboutMe = () => {
  return (
    <section className='py-[6rem] relative'>
        <div className="container space-y-[5rem]">
            {/* HEADING */}
            <div className="flex flex-wrap lg:flex-nowrap gap-6 xl:gap-x-14">
                <div className="flex gap-4">
                    <Card className='w-[14rem] h-full aspect-[16/14] text-center shadow-md rounded-xl'>
                        <CardContent className='p-4 xl:p-6 h-full flex flex-col justify-center'>
                            <h3 className="text-4xl xl:text-6xl leading-[1] font-barlow font-bold mb-2">8+</h3>
                            <p className="text-sm xl:text-md">Years of Experience</p>
                        </CardContent>
                    </Card>
                    <Card className='w-[14rem] h-full aspect-[16/14] text-center shadow-md rounded-xl'>
                        <CardContent className='p-4 xl:p-6 h-full flex flex-col justify-center'>
                            <h3 className="text-4xl xl:text-6xl leading-[1] font-barlow font-bold mb-2">1.5k+</h3>
                            <p className="text-sm xl:text-md">Projects completed</p>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <p>With over 8 years as a Full Stack Developer, I specialize in building user-focused, high-performing websites. At Digital Farmers, I create responsive applications using React, Next.js, and Django, with expertise in Shopify Plus, WooCommerce, and WordPress, enabling tailored solutions that exceed client expectations. My Marketing degree enhances my focus on UX and engagement.</p>
                        
                    <Button className='mt-6' variant={'outlinePrimary'} asChild>
                        <Link href={'/'} className='uppercase'>
                            <span>Learn More</span>
                            <span><GoArrowUpRight className='h-5 w-5 icon'/></span>
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-12 gap-x-14">
                <div className='col-span-7'>
                    <div className="relative border-2 border-dark rounded-xl overflow-hidden">
                        <Image src={VideoCover} alt='Web developer arif' className='aspect-[16/9.2] object-cover object-center shadow-lg'/>

                        <span className="absolute top-2/4 start-2/4 -translate-x-2/4 -translate-y-2/4 bg-[#fff] text-[#000] rounded-full w-[4rem] aspect-square flex items-center justify-center scale-100 hover:scale-110 transition-all duration-150 ease-linear cursor-pointer z-10 before:content-[''] before:animate-[pulse-border_1500ms_ease-out_infinite] before:absolute before:w-full before:h-full before:bg-[#fff] before:-z-[1] before:rounded-full">
                            <FaPlay />
                        </span>

                    </div>
                </div>
                <div className='col-span-5'>
                    <div className="flex flex-wrap">
                        <Image src={IconVSCode} alt='Vs Code' />
                        <Image src={IconFIgma} alt='Figma' />
                        <Image src={IconAdobePS} alt='Adobe Photoshop' />
                        <Image src={IconAdobeXD} alt='Adobe XD' />
                        <Image src={IconGithub} alt='Github' />
                        <Image src={IconHTML} alt='HTML' />
                        <Image src={IconCSS} alt='CSS' />
                        <Image src={IconSass} alt='Sass' />
                        <Image src={IconJS} alt='JS '/>
                        <Image src={IconReact} alt='React '/>
                        <Image src={IconNextJS} alt='Next Js '/>
                        <Image src={IconTS} alt='Typescript '/>
                        <Image src={IconVite} alt='Vite Js'/>
                        <Image src={IconJWT} alt='JWT'/>
                        <Image src={IconWP} alt='WordPress'/>
                        <Image src={IconWooCommerce} alt='WooCommerce'/>
                        <Image src={IconLiquid} alt='Liquid'/>
                        <Image src={IconShopify} alt='Shopify'/>
                        <Image src={IconPrisma} alt='Prisma'/>
                        <Image src={IconWebpack} alt='Webpack'/>
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default AboutMe;