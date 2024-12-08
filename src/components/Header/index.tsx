"use client";
// import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils"

import { Button } from '@/components/ui/button';
import { AiOutlineMessage } from "react-icons/ai";
import { GlobalSettingsProps } from '@/types/global';

// import LOGO from './logo.svg';
// import { VscColorMode } from "react-icons/vsc";

// import { LiaBarsSolid } from "react-icons/lia";
import ModeChanger from './Mode';
import Logo from './Logo';
import Navigation from './Navigation';

const Header: React.FC<GlobalSettingsProps> = ({ identity, menu }) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "header start-0 end-0 w-full z-[50] font-barlow",
        {
          'shadow-[0_1px_3px_#12142024] fixed animate-[headerSticky_0.4s] top-0 bg-card/75 before:content-[""] before:absolute before:w-full before:h-full before:top-0 before:backdrop-blur-[10px] before:-z-[1]':
            isSticky,
          'absolute top-[30px]': !isSticky,
        }
      )}
    >
      <div className="container">
        <div
          className={cn(
            "header__nav flex justify-between items-center py-[25px]",
            {
              'rounded-[10px] shadow-[0_0_67px_#6d758f21] bg-[linear-gradient(0deg,#ffffff_0%,#ECF0F3_100%)] dark:bg-[linear-gradient(0deg,rgb(var(--card-rgb))_0%,rgb(var(--card-rgb))_100%)] px-[30px] lg:px-[50px]': !isSticky,
            }
          )}
        >
          {/* LOGO */}
          <div className="header__logo max-w-[120px] xl:max-w-[150px] w-[40vw]">
            {identity && <Logo identity={identity}/>}
          </div>
          {/* NAVIGATION */}
          <div className="header__navbar hidden xl:flex items-center text-md uppercase">
            {menu && <Navigation menu={menu}/>}
          </div>

          {/* BUTTON */}
          <div className="header__action hidden lg:inline-flex items-center gap-x-4">
            <ModeChanger />
            <Button variant={'primary'} size={'lg'} asChild>
              <Link href="/schedule" className='inline-flex items-center uppercase font-semibold'>
                <span>Let&apos;s Talk</span>
                <AiOutlineMessage className='w-5 h-5 icon' />
              </Link>
            </Button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="inline-flex items-center gap-x-4 lg:hidden">
            <ModeChanger />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
