import { SiteIdentityProps } from '@/types/global'; 
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const Logo: React.FC<{ identity: SiteIdentityProps }> = ({ identity }) => {
  const { logo, siteTitle } = identity;

  return (
    <Link className='relative inline-flex' href={'/'}>
      {logo && (
        <Image
          src={logo}
          width={200}
          height={60}
          alt={siteTitle || 'Web Developer Arif'}
          className='h-[2rem] w-auto dark:invert dark:brightness-100'
        />
      )}
    </Link>
  );
};

export default Logo;
