import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'
import { GoArrowUpRight } from 'react-icons/go';
import { FaDiscord } from "react-icons/fa";


const PromoteBox = () => {
  return (
    <div className='py-[100px] text-center relative before:content-[""] before:absolute before:z-[-1] before:bg-[linear-gradient(rgb(var(--dark-rgb)),transparent_1px),linear-gradient(to_right,rgb(var(--dark-rgb)),transparent_1px)] before:bg-[100%_48px,51px_100%] before:opacity-[0.15] before:inset-0'>
      <div className="container max-w-[850px]">
            <h2 className="text-4xl md:text-6xl leading-[1.2] mb-6 font-bold text-dark ">Hello👋i&apos;m available for freelance work</h2>
            <h4 className="text-xl md:text-2xl font-medium text-dark mb-7 inline-flex items-center gap-x-7">
                <span>For quick response:</span> 
                <Link href="https://discord.com/users/597489478327861269" target='_blank' className='relative inline-flex text-[75%] uppercase font-semibold items-center gap-1'>
                <FaDiscord className='w-5 h-5 text-[#5865F2]'/>
                    <span>Chat Now</span>
                    <svg className="absolute w-[135%] h-auto start-2/4 top-2/4 -translate-x-2/4 -translate-y-2/4 animate-[dashstroke-animation_3s_infinite] transition-all duration-[0.7s] animation-delay-1000 ease-linear" xmlns="http://www.w3.org/2000/svg" width="78.066" height="17.01" viewBox="0 0 78.066 17.01">
                        <g id="Rond" transform="translate(-504.5 -60.901)">
                            <path id="A_vendre" data-name="A vendre" d="M290.192,865.651c-19,.456-33.7,3.564-33.7,7.33,0,4.081,17.252,7.388,38.533,7.388s38.533-3.308,38.533-7.388c0-3.818-20.327-8.224-39.705-8.612" transform="translate(248.509 -802.959)" fill="none" stroke="#5865F2" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="1"></path>
                        </g>
                    </svg>
                </Link>
            </h4>
            <div className="mt-3">
                <Button variant={'primary'} asChild>
                    <Link href={'/contact'} className='uppercase'>
                        <span>HIRE ME NOW</span>
                        <span><GoArrowUpRight className='h-5 w-5 icon'/></span>
                    </Link>
                </Button>
            </div>
      </div>
    </div>
  )
}

export default PromoteBox;
