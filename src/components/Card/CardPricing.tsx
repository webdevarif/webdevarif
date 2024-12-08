'use client';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { PricingPostProps, ReviewProps } from '@/types/pricing';
import { Card, CardContent } from '../ui/card';
import { IoCheckmark } from "react-icons/io5";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GoArrowUpRight } from 'react-icons/go';

const CardReviews: React.FC<{ reviews: ReviewProps[] }> = ({ reviews }) => {
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

  return (
    <Carousel className='mb-4 select-none' setApi={setApi}>
      <CarouselContent>
        {reviews.map((review, r) => (
          <CarouselItem key={review.id ?? r}>
            <div className="text-sm p-3 pb-7 h-full border border-dark/10 rounded-lg">
              <div className="flex items-center gap-x-2 mb-2">
                <div className="flex gap-2">
                  <Avatar className='w-9 h-9'>
                    <AvatarImage className='object-cover' src={review.featured_image ?? ''} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-dark font-bold line-clamp-1">{review.title}</h3>
                    {review.author_bio && <p className="text-xs text-foreground line-clamp-1">{review.author_bio}</p>}
                  </div>
                </div>
                <div className="ms-auto">
                  <Avatar className='w-7 min-w-7 h-7'>
                    <AvatarImage className='object-cover' src={review.review_from ?? ''} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {review.content && (
                <div className="text-sm leading-[1.6] font-light line-clamp-3" dangerouslySetInnerHTML={{ __html: review.content }} />
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation Dots */}
      <div className="flex justify-start absolute bottom-0 w-full ps-2 py-3">
        {reviews.map((_, index) => (
          <button
            key={index}
            onClick={() => api && api.scrollTo(index)}
            className={`w-2 h-2 mx-1 rounded-full ${index === current ? 'bg-dark' : 'bg-dark/25'}`}
            aria-label={`Go to slide ${index + 1}`}
          ></button>
        ))}
      </div>
    </Carousel>
  );
};

const CardPricing: React.FC<{ post: PricingPostProps }> = ({ post }) => {
  return (
    <Card className='h-full bg-[linear-gradient(0deg,rgb(var(--white-rgb))_20%,rgb(var(--background-rgb))_100%)] border-2 border-background rounded-[1.5rem] text-foreground'>
      <CardContent className='px-4 lg:px-6 lg:py-8'>
        {post.title && 
          <div className="flex items-center gap-2 mb-4">
            <span style={{ backgroundColor: post.color }} className={`text-[#fff] text-xs px-[1rem] py-[0.4rem] font-barlow uppercase tracking-widest inline-block rounded-full`}>{post.title}</span>
          </div>
        }
        
        <div className='mb-4'>
          <h2 className="text-5xl leading-[1] font-bold text-dark mb-2">
            {post.price && <span>${post.price}</span>}
            /{post.label && <span className="text-sm">{post.label}</span>}
          </h2>
          {post.info && <p className="text-sm">{post.info}</p>}
        </div>

        {/* REVIEWS */}
        {post.reviews && <CardReviews reviews={post.reviews}/>}

        {post.features &&
        <div className='mb-7'>
          <h6 className="text-xl font-bold text-dark mb-3 uppercase">Features:</h6>
          <ul className="space-y-2 text-md">
            {post.features.map((feature, i) => (
              <li key={i} className='flex items-center gap-x-3'>
                <IoCheckmark className='w-5 h-5'/>{feature}</li>
            ))}
          </ul>
        </div>
        }

        <div className='mt-auto'>
          <Button variant={'primary'} asChild>
            <Link href={post.order_link ?? ''} className='uppercase'>
              <span>ORDER NOW</span>
              <span><GoArrowUpRight className='h-5 w-5 icon'/></span>
            </Link>
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};

export default CardPricing;
