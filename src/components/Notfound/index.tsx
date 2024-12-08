import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import { HomeIcon } from 'lucide-react'

const Notfound = () => {
  return (
    <div className="min-h-[25rem] h-[60vh] flex flex-col justify-center py-[50px] text-center">
        <div className="container">
        <h1 className="text-[7rem] lg:text-[10rem] leading-[1] text-dark mb-1 font-bold uppercase">404</h1>
        <p className='mb-6 text-lg'>The requested page was not exist.</p>
        <Button variant={'primary'} size={'lg'} asChild>
            <Link href="/" className="">
                <span>GO TO HOME</span>
                <HomeIcon className='w-5 h-5 icon'/>
            </Link>
        </Button>
        </div>
    </div>
  )
}

export default Notfound
