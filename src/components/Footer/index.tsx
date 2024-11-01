import { GlobalSettingsProps } from '@/types/global';
import React from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ChevronsUp, Instagram, Mail } from 'lucide-react';

const Footer: React.FC<GlobalSettingsProps> = ({ identity, menu }) => {
  return (
    <footer className="footer bg-black text-white">
      <div className="pt-[6rem] pb-[4rem]">
        <div className="container">
          <div className="grid sm:grid-cols-[5fr_2fr] lg:grid-cols-[1fr_240px_auto] gap-y-10 gap-x-4">
            <div className="footer-block">
              <h2 className="text-3xl sm:text-5xl md:text-6xl mb-8 uppercase font-bold font-unbounded tracking-tight text-white">Let&apos;s Work Together</h2>
              <ul className="flex flex-wrap gap-3">
                <li>
                  <Button variant={'outline'} className='border-2 bg-white text-black rounded-full px-8 hover:bg-black hover:border-white hover:text-white' asChild size={'lg'}>
                    <Link href="/" className='inline-flex items-center uppercase gap-3 transition-all duration-150 ease-linear'>
                      <Mail />
                      <span>Email Me</span>
                    </Link>
                  </Button>
                </li>
                <li>
                  <Button variant={'outline'} className='border-2 border-white/25 bg-transparent text-white rounded-full px-8 hover:bg-white hover:border-white hover:text-black' asChild size={'lg'}>
                    <Link href="/" className='inline-flex items-center uppercase gap-3 transition-all duration-150 ease-linear'>
                      <Instagram />
                      <span>Instagram</span>
                    </Link>
                  </Button>
                </li>
              </ul>
            </div>
            <div className="footer-block">
              <h3 className="font-unbounded uppercase mb-6 font-bold text-lg">What I Do?</h3>
              <ul className="space-y-3 text-md font-optima-pro">
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Web Development</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Mobile Development</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Brand Identity</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Graphics Design</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Software Migration</Link></li>
              </ul>
            </div>
            <div className="footer-block">
              <h3 className="font-unbounded uppercase mb-6 font-bold text-lg">More Info</h3>
              <ul className="space-y-3 text-md font-optima-pro">
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Privacy Policy</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Terms and Conditions</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Cookie Policy</Link></li>
                <li><Link href="/" className='text-white/50 hover:text-white transition-all duration-150 ease-linear'>Careers</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-[4rem]">
        <div className="container">
          <hr className="border-t-2 border-white/5 mb-5" />
          <div className="flex gap-3 flex-col md:flex-row items-center justify-between">
            <div className='text-white/50 uppercase text-sm'>Copyright © 2024 WebDevarif. All Rights Reserved</div>
            <div>
              <Link className='uppercase inline-flex gap-1 items-center hover:text-white/50 duration-300 transition-all ease-linear font-medium ' href="#home">
                <span>Back To Top</span>
                <ChevronsUp />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer;