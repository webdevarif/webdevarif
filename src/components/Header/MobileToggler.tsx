import React from 'react'
import {
  Sheet,
  SheetContent,
  // SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SiteIdentityProps } from '@/types/global';
import { Button } from '@/components/ui/button';
import { LiaBarsSolid } from 'react-icons/lia';
import Logo from './Logo';


const MobileToggler: React.FC<{ identity: SiteIdentityProps }> = ({ identity }) => {
  return (
    <Sheet>
      <SheetTrigger>
        <Button variant={'default'} className='rounded-full' size={'icon'}>
          <LiaBarsSolid className='w-6 h-6' />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="mb-5 max-w-[120px] xl:max-w-[150px] w-[40vw]">
          {identity && <Logo identity={identity}/>}
        </div>
          {/* {menu && <ul className='space-y-4 text-start'>
            {menu.map((item, index) => <li key={index}>
              <Link href={item.url}>{item.title}</Link>
            </li>)}
          </ul>} */}
      </SheetContent>
    </Sheet>
  )
}

export default MobileToggler
