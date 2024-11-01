"use client";
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { cn } from "@/lib/utils"

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
  } from "@/components/ui/navigation-menu"
import { Button } from '@/components/ui/button';
import { AlignJustify } from 'lucide-react';
import { GlobalSettingsProps } from '@/types/global';
import { FiMessageSquare } from "react-icons/fi";

const Header: React.FC<GlobalSettingsProps> = ({ identity, menu }) => {
  return (
    <header className='header py-2 xl:py-4 absolute start-0 end-0 top-0 z-10 border-b border-black' id="home">
      <div className="container">
          <div className="grid grid-cols-[40px_1fr_auto] xl:grid-cols-[auto_1fr_auto] gap-x-[10px] items-center xl:gap-x-[30px]">
              {/* TOGGLER */}
              <div className="inline-flex xl:hidden items-center justify-center">
                <Button variant={'ghost'} size={'icon'}><AlignJustify /></Button>
              </div>
              {/* LOGO */}
              <div className="header__logo max-w-[120px] xl:max-w-[150px] w-[40vw]">
                  <Link className='relative inline-flext' href={'/'}>
                    {identity?.logo && <Image src={identity.logo} width={200} height={60} alt='web developer' className='h-[25px] w-auto'/>}
                  </Link>
              </div>
              {/* NAVBAR */}
              <div className="header__navbar hidden xl:flex items-center text-sm font-unbounded uppercase">
                {menu &&
                  <NavigationMenu>
                    <NavigationMenuList>
                      {menu.map((item, index) =>(
                      <NavigationMenuItem key={index}>
                        {item.children.length > 0 ? <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger> :
                        <Link href={item.url}>
                          <NavigationMenuLink className={navigationMenuTriggerStyle()}>{item.title}</NavigationMenuLink>
                        </Link>
                        }
                        {item.children.length > 0 &&
                        <NavigationMenuContent>
                          <ul className='w-[15rem] py-2 px-3'>
                            {item.children.map(( sub, subIndex ) =>(
                            <li key={subIndex}>
                              <NavigationMenuLink asChild>
                                <Link className='py-2 block px-4' href={sub.url}>{sub.title}</Link>
                              </NavigationMenuLink>
                            </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                        }
                      </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>}
              </div>
              {/* INFO */}
              <div className="header__button">
                <span className="inline-block relative z-10 before:transition-all before:duration-300 before:ease-linear before:content-[''] before:w-full before:h-full before:bg-black before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]">
                  <Button variant={'outline'} size={'lg'} asChild>
                    <Link href="/schedule" className='inline-flex items-center gap-2 uppercase font-unbounded text-sm'>
                      <span>Let's Talk</span>
                      <FiMessageSquare className='w-5 h-5'/>
                    </Link>
                  </Button>
                </span>
              </div>
          </div>
      </div>
    </header>
  )
}

export default Header;

