import React from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { MenuItemNode } from '@/types/global';
import Link from 'next/link';

const Navigation: React.FC<{ menu: MenuItemNode[] }> = ({ menu }) => {

  return (
    <NavigationMenu>
        <NavigationMenuList>
            {menu && menu.map((item, index) => (
            <NavigationMenuItem key={index}>
                {item.children.length > 0 ? 
                    <React.Fragment>
                        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className='w-[15rem] py-2 px-3'>
                                {item.children.map((sub, subIndex) => (
                                    <li key={subIndex}>
                                    <NavigationMenuLink asChild>
                                        <Link className='py-2 block px-4' href={sub.url}>{sub.title}</Link>
                                    </NavigationMenuLink>
                                    </li>
                                ))}
                            </ul>
                        </NavigationMenuContent>
                    </React.Fragment>
                :
                <Link href={item.url} legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>{item.title}</NavigationMenuLink>
                </Link>
                }
                
            </NavigationMenuItem>
            ))}
        </NavigationMenuList>
    </NavigationMenu>
  )
}

export default Navigation
