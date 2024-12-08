"use client";
import React from 'react';
import { useTestimonials } from '@/actions/queries';
import SectionHeading from '@/components/Common/SectionHeading';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import Image from 'next/image';
import { ImStarHalf } from "react-icons/im";
import { ImStarFull } from "react-icons/im";
import Skeleton from './Skeleton';


const Testimonials = () => {
    const { data, isLoading } = useTestimonials('&per-page=3');
    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);
  
    React.useEffect(() => {
      if (!api) return;
  
      const onSelect = () => setCurrent(api.selectedScrollSnap());
      api.on("select", onSelect);
      // Set initial state
      onSelect();
  
      return () => { api.off("select", onSelect); };  // Clean up listener
    }, [api]);

    console.log("data", data);

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <>
        {[...Array(5)].map((_, idx) => {
          // Handle half star position
          if (idx < fullStars) {
            return <ImStarFull key={idx} className='text-yellow-500'/>;
          } else if (idx === fullStars && hasHalfStar) {
            return <ImStarHalf key={idx} className='text-yellow-500'/>;
          } else {
            return <ImStarFull key={idx} className='text-gray-300'/>;
          }
        })}
      </>
    );
  };

  return (
    <div className='py-[5rem]'>
        <div className="container">
            <div className="mb-[3rem] flex gap-3 items-end justify-between">
                <SectionHeading caption={'Testimonials'} title={'Client Testimonials'} className="text-start max-w-full m-0"/>
                <div className="inline-flex justify-start px-3 relative before:w-full before:h-[2px] before:bg-dark before:absolute before:end-0 before:top-2/4 before:-translate-y-2/4">
                    {data && data.map((_, index) => (
                    <span
                        key={index}
                        onClick={() => api && api.scrollTo(index)}
                        className={`w-[30px] h-[30px] mx-2 border-2 border-dark mx-1 rounded-full relative before:w-[12px] before:h-[12px] before:absolute before:top-2/4 before:start-2/4 before:-translate-x-2/4 before:-translate-y-2/4 before:border-2 before:border-dark before:rounded-full bg-background cursor-pointer ${index === current ? 'before:bg-dark' : ''}`}
                        aria-label={`Go to slide ${index + 1}`}
                    ></span>
                    ))}
                </div>
            </div>

            <div className="">
                <Carousel className='mb-4 select-none' setApi={setApi}>
                    <CarouselContent className='p-2'>
                        { isLoading ? <Skeleton /> : data && data.map((testimonial, index) =>(
                            <CarouselItem key={testimonial.id ?? index}>
                                <div className="grid grid-cols-12 gap-10 border-[0.4rem] border-white shadow-md px-10 py-[5rem] z-0 bg-[linear-gradient(90deg,rgb(var(--white-rgb))_20%,rgb(var(--background-rgb))_100%)] text-foreground rounded-2xl relative before:content-[''] before:w-1/4 before:h-full before:absolute before:bg-background before:top-0 before:bottom-0 before:rounded-l-2xl before:-z-[1]">
                                    <div className="col-span-5 h-full flex flex-col justify-center">
                                        {testimonial.featured_image && <div className='w-3/4 relative mx-auto before:w-[115%] before:h-[115%] before:border-dashed before:border-2 before:border-dark before:absolute before:absolute before:top-2/4 before:start-2/4 before:rounded-full before:-translate-x-2/4 before:-translate-y-2/4 before:animation-rotate'><Image className='rounded-full w-full h-full object-cover object-center' src={testimonial.featured_image} width={500} height={500} alt={testimonial.title}/></div>}
                                    </div>
                                    <div className="col-span-7">
                                        <div className="flex flex-col h-full">
                                            <h4 className="text-xl font-bold tracking-widest font-barlow text-dark mb-2 uppercase flex items-center gap-3">
                                                <span>Reviews On</span>
                                                <Avatar>
                                                    <AvatarImage className='w-8 min-w-8 h-8 object-cover object-center' src={testimonial.review_from} alt={testimonial.title} />
                                                    <AvatarFallback>RF</AvatarFallback>
                                                </Avatar>
                                            </h4>
                                            <div className="inline-flex items-center gap-3 text-xl font-light mb-5">
                                                <div className="inline-flex gap-[0.25rem]">{renderStars(Number(testimonial.star_rating))}</div>
                                                {testimonial.star_rating} Ratings
                                            </div>

                                            <div className="mb-4">
                                                { testimonial.content && <div className="text-2xl leading-[1.6] font-barlow font-light"  dangerouslySetInnerHTML={{ __html: testimonial.content }} /> }
                                            </div>

                                            <div className="mt-auto border-t-2 pt-2 flex gap-3 justify-between">
                                                <div className="pt-2">
                                                    { testimonial.title && <h4 className="text-2xl text-dark font-semibold mb-2">{testimonial.title}</h4>}
                                                    { testimonial.author_bio && <p className='text-lg'>{testimonial.author_bio}</p>}
                                                </div>
                                                <div className="text-7xl leading-[1] font-barlow font-bold text-stroke">
                                                    0{index + 1}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
        </div>
    </div>
  )
}

export default Testimonials;
