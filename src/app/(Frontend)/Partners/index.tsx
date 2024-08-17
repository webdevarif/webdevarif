import React from 'react';
import PartnerThumb from './images/brand-logo2.png';

const partners = [
    { thumb: PartnerThumb },
    { thumb: PartnerThumb },
    { thumb: PartnerThumb },
    { thumb: PartnerThumb },
    { thumb: PartnerThumb },
    { thumb: PartnerThumb },
]

const Partners = () => {
  return (
    <section className='border-t border-white border-opacity-15 py-[100px] text-center'>
        <h2 className="text-[40px] font-bold font-outfit leading-[1.1] mb-[30px] lg:mb-[50px]">Trusted by World Leading Brands</h2>

        <div className="partners-group overflow-hidden whitespace-nowrap relative flex">
            <div className="partners-slide">
                <div className="marquee-slide">
                    <div className="flex justify-around min-w-full items-center">
                        {partners.map((partner, index) => (
                            <a href='#' key={index} className="border border-white border-opacity-25 py-0 px-[50px] cursor-pointer rounded-[40px] h-[80px] w-[220px] mx-[30px] flex items-center justify-center">
                                <img src={partner.thumb.src} alt="Thumbnail" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            <div className="partners-slide">
                <div className="marquee-slide">
                    <div className="flex justify-around min-w-full items-center">
                        {partners.map((partner, index) => (
                            <a href='#' key={index} className="border border-white border-opacity-25 py-0 px-[50px] cursor-pointer rounded-[40px] h-[80px] w-[220px] mx-[30px] flex items-center justify-center">
                                <img src={partner.thumb.src} alt="Thumbnail" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Partners