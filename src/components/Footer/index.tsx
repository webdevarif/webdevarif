import { GlobalSettingsProps } from '@/types/global';
import React from 'react';
import Link from 'next/link';
// import Image from 'next/image';
import Logo from '../Header/Logo';

const Footer: React.FC<GlobalSettingsProps> = ({ identity, menu }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer text-center font-barlow">
      <div className="container">
        <div className="py-[6rem] px-4 space-y-8 bg-black text-dark-foreground/75 rounded-t-[2rem]">
          {/* LOGO */}
          <div className="footer__logo [&_img]:invert [&_img]:dark:invert-0">
            {identity && <Logo identity={identity}/>}
          </div>
          <div className="footer__navigation">
            {/* NAVIGATION */}
            {menu && <ul className='flex flex-wrap items-center justify-center gap-x-6 gap-y-3 uppercase font-medium'>
              {menu.map((item, index) =><li key={index}>
                <Link className='duration-150 transition-all hover:text-dark-foreground' href={item.url}>{item.title}</Link>
              </li>)}
            </ul>}
          </div>
          
          {/* COPYRIGHT */}
          <div className="footer__copyright">
            <div className='text-xs leading-[1.5] bg-dark-foreground/5 inline-block px-8 py-2 rounded-full uppercase'>
              Copyright © {currentYear} WebDevarif. All Rights Reserved
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
