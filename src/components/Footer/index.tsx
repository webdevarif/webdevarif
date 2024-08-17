import React from 'react';
import Logo from './images/logo.png';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className='footer text-center pt-[50px] pb-[30px] bg-card'>
      <div className="container">
        <div className="mb-[10px]">
            <Link className='relative w-[100px] h-[100px] inline-block' href={'/'}><Image src={Logo} alt='web developer' fill/></Link>
        </div>
        <div className="space-y-[20px]">
          <ul className='flex items-center gap-x-[20px] flex-wrap gap-y-[15px] justify-center text-[16px] font-semibold'>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>Home</Link>
            </li>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>About Me</Link>
            </li>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>My Services</Link>
            </li>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>Projects</Link>
            </li>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>Blogs</Link>
            </li>
            <li>
              <Link href={'/'} className='transition-all duration-300 ease-linear hover:text-primary'>Contact Me</Link>
            </li>
          </ul>
          <div className='text-[14px] text-white text-opacity-50 font-outfit'>© 2024 All Rights Reserved by <Link className='text-primary font-kanit font-normal' href={'/'}>WebDevArif</Link></div>
        </div>
      </div>
    </footer>
  )
}

export default Footer