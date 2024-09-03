"use client";
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Logo from './logo-light.svg';
import { FaCommentSms } from "react-icons/fa6";
import { menus } from './data';
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
 
  
const Header = () => {
  return (
    <header className='header py-2 lg:py-6 absolute start-0 end-0 top-0 z-10'>
        <div className="container">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[30px]">
                {/* LOGO */}
                <div className="header__logo max-w-[150px] w-[40vw]">
                    <Link className='relative inline-flext' href={'/'}>
                      <Image src={Logo} alt='web developer' className='h-[25px] w-auto'/>
                    </Link>
                </div>
                {/* NAVBAR */}
                <div className="header__navbar flex items-center justify-center">
                  <NavigationMenu>
                    <NavigationMenuList>
                      {menus.map((menu, index) =>(
                          menu.submenu ?
                          <NavigationMenuItem key={menu.id ?? index}>
                            <NavigationMenuTrigger>{ menu.title }</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                <li className="row-span-3">
                                    <NavigationMenuLink asChild>
                                    <Link
                                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                        href="/"
                                    >
                                        <div className="mb-2 mt-4 text-lg font-medium">
                                          Html/React/Nexts
                                        </div>
                                        <p className="text-sm leading-tight text-muted-foreground">
                                        Beautifully designed components built with Radix UI and
                                        Tailwind CSS.
                                        </p>
                                    </Link>
                                    </NavigationMenuLink>
                                </li>
                                <ListItem href='/docs' title="Shopify Theme/App Development">
                                    Re-usable components built using Radix UI and Tailwind CSS.
                                </ListItem>
                                <ListItem href="/docs/installation" title="Elementor Theme Development">
                                    How to install dependencies and structure your app.
                                </ListItem>
                                <ListItem href="/docs/primitives/typography" title="WooCommerce Theme Development">
                                    Styles for headings, paragraphs, lists...etc
                                </ListItem>
                                </ul>
                              </NavigationMenuContent>
                            </NavigationMenuItem>
                            :
                        <NavigationMenuItem key={menu.id ?? index}>
                          <Link href={ menu.slug } legacyBehavior passHref>
                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                              {menu.title}
                            </NavigationMenuLink>
                          </Link>
                      </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </div>
                {/* INFO */}
                <div className="header__info">
                    <div className="inline-flex items-start gap-x-3">
                        <FaCommentSms className='w-[45px] h-[45px] mt-[3px] text-primary'/>
                        <div className='flex flex-col gap-0'>
                            <h6 className="text-[14px] opacity-75 leading-5">Have any Questions?</h6>
                            <div className="text-[20px] leading-6 tracking-[-0.6px]"><Link className='cursor-hover' href={'mailto:arifcpam@gmail.com'}>Quick Email Us</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
  )
}


const ListItem = React.forwardRef<React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, href, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href="/docs"
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

export default Header;

