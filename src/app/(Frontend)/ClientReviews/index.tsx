"use client";

import React from 'react';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
// import Swiper core and required modules
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

import AuthorThumb from './images/author.png';
import Image from 'next/image';
import { RiStarFill, RiStarHalfFill } from "react-icons/ri";


const reviews = [
    { name: "Mo" },
    { name: "Mo" }, 
    { name: "Mo" },
    { name: "Mo" },
]

const ClientReviews = () => {
  return (
    <section className='client-reviews bg-card bg-opacity-25 py-[100px]'>
        <div className="container">
            <div className="grid grid-cols-2 gap-x-[40px] gap-y-[20px]">
                <div className="grid__item">
                    <h2 className="text-[40px] font-bold font-outfit leading-[1.1] mb-[20px]">My Client&apos;s Stories</h2>
                    <div className="space-y-[15px] text-white text-opacity-60">
                        <p>Empowering people in new a digital journey with my super services</p>
                    </div>
                </div>
                <div className="grid__item">
                    <div className="client-reviews-slides">
                        <Swiper
                            // install Swiper modules
                            modules={[Pagination]}
                            spaceBetween={15}
                            slidesPerView={2}
                            onSlideChange={() => console.log('slide change')}
                            onSwiper={(swiper) => console.log(swiper)}
                            pagination={{ clickable: true }}
                        >
                            {reviews.map((review, index) =>(
                                <SwiperSlide key={index} className='!h-auto'>
                                    <div className="bg-background p-[20px] rounded-[12px] flex flex-col h-full">
                                        <div className="flex gap-3 justify-between mb-[30px]">
                                            <div>
                                                <h3 className="text-[20px] font-kanit font-semibold ">Brandon Fraser</h3>
                                                <div className="text-[13px] font-outfit text-white/40">Senior Software Dev, Cosmic Sport</div>
                                            </div>
                                            <div className="w-[40%] h-[100px] bg-card overflow-hidden rounded-[5px_5px_5px_125px]">
                                                <Image src={AuthorThumb} alt="Banner" className='w-full h-full object-cover object-[top_center]'/>
                                            </div>
                                        </div>
                                        <div className="mb-[35px] space-y-[15px] text-white text-opacity-60 text-[14px]">
                                            <p>&apos; This creative agency stands out with their exceptional talent and expertise. Their ability to think outside the box and bring unique ideas to life is truly impressive. With meticulous attention to detail, they consistently deliver visually stunning and impactful work. </p>
                                        </div>
                                        <div className="mt-auto pt-4">
                                            <div className="flex items-center gap-[2px] text-[14px] text-[#ffbf35] relative z-[1] before:w-[150px] before:h-[40px] before:bottom-0 before:-skew-x-[20deg] before:bg-card before:bg-opacity-50 before:content-[''] before:absolute before:z-[-1]">
                                                <span className="font-outfit font-medium leading-[1] -mt-[1px] me-3 w-[38px] inline-flex justify-center items-center text-black relative z-[1] h-[40px] before:content-[''] before:w-full before:h-full before:bg-[#ffbf35] before:absolute before:z-[-1] before:left-0 before:bottom-0 before:-skew-x-[20deg]">5.0</span>
                                                <RiStarFill />
                                                <RiStarFill />
                                                <RiStarFill />
                                                <RiStarFill />
                                                <RiStarHalfFill  />
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default ClientReviews;