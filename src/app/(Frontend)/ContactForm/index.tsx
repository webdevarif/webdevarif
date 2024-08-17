"use client";
import React from 'react';
// Make sure to run npm install @formspree/react
// For more help visit https://formspr.ee/react-help
import { useForm as useFormspree, ValidationError } from '@formspree/react';
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import ServiceOverlay from './images/overlay-bg.png';
import { Label } from '@radix-ui/react-label';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod";

import ServiceWordPress from './images/wordpress.png';
import ServiceWoocommerce from './images/Woocommerce.png';
import ServiceShopify from './images/Shopify.png';
import ServiceNextJs from './images/NextJs.png';
import ServiceTailwind from './images/tailwind.png';
import ServiceBootstrap from './images/Bootstrap.png';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

// Define your schema with Zod
const FormSchema = z.object({
    full_name: z.string().min(2).max(50),
    email: z.string().email(),
    skype_whatsapp: z.string(),
    phone: z.string(),
    meeting_date: z.string().refine((date) => {
        return !isNaN(Date.parse(date));
    }, {
        message: "Invalid date format",
    }),
    services: z.string().min(5, { message: "Service is required." }),
    message: z.string().min(5, { message: "Message is required." }),
});

// Infer the type from the schema
type FormSchemaType = z.infer<typeof FormSchema>;

import { cn } from "@/lib/utils"
import { CalendarClock, CalendarDays, CheckCheck, CheckIcon } from 'lucide-react';
import Image from 'next/image';

const ContactForm = () => {
    const form = useForm<FormSchemaType>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            full_name: '',
            email: '',
            skype_whatsapp: '',
            phone: '',
            meeting_date: new Date().toISOString(), // Convert Date to ISO string
            services: '',
            message: ''
        },
    });

    const onSubmit = (data: FormSchemaType) => {
        // Convert the date string back to a Date object if needed
        const meeting_date = new Date(data.meeting_date);
        console.log(meeting_date, data);
    };

    const [state, handleSubmit] = useFormspree("xvoenwrq");
    if (state.succeeded) {
        return <p>Thanks for joining!</p>;
    }

    const services = [
        { 
            heading: 'Wordpress', 
            thumbnail: ServiceWordPress,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
        { 
            heading: 'Woocommerce', 
            thumbnail: ServiceWoocommerce,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
        { 
            heading: 'Shopify', 
            thumbnail: ServiceShopify,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
        { 
            heading: 'NextJs', 
            thumbnail: ServiceNextJs,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
        { 
            heading: 'Html/Tailwind', 
            thumbnail: ServiceTailwind,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
        { 
            heading: 'Html/Bootstrap', 
            thumbnail: ServiceBootstrap,
            list: [
                {
                    text: 'Custom Theme Development'
                },
                {
                    text: 'Existing Theme/Plugin Modification'
                },
                {
                    text: 'Theme/Plugins Bug Fixing'
                },
                {
                    text: 'Responsive Design'
                },
                {
                    text: 'SEO, Speed Optimization'
                },
            ]
        },
    ];

    const faqs=[
        {
            heading: "where are you from?",
            content: "lorem ipsumn",
        },
        {
            heading: "Do you only create WordPress websites?",
            content: "lorem ipsumn",
        },
        {
            heading: "Will you maintain my site for me?",
            content: "lorem ipsumn",
        },
        {
            heading: "Will my website be mobile-friendly?",
            content: "lorem ipsumn",
        },
        {
            heading: "How long does it take to build a website?",
            content: "lorem ipsumn",
        },
        {
            heading: "What if I need help on my site down the road?",
            content: "lorem ipsumn",
        },
        {
            heading: "Who hosts the website?",
            content: "lorem ipsumn",
        },
        {
            heading: "Can I update the website myself once it’s built?",
            content: "lorem ipsumn",
        },
        {
            heading: "I want to have an email signup form on my website? How can I do this?",
            content: "lorem ipsumn",
        },
        {
            heading: "How many pages do I get with my website?",
            content: "lorem ipsumn",
        },
        {
            heading: "How do you build my website?",
            content: "lorem ipsumn",
        },
        {
            heading: "I already have a website, how easy is it to change it?",
            content: "lorem ipsumn",
        },
        {
            heading: "How long will it take to get to the 1st page of Google?",
            content: "lorem ipsumn",
        },
        {
            heading: "How much does hosting cost?",
            content: "lorem ipsumn",
        },
    ]

    return (
        <section className='contact-area py-[100px]'>
            <div className="container">
                <div className="grid grid-cols-2 gap-[35px]">
                    <div className="grid__item">
                        <div className="bg-card p-[30px] rounded-[12px] shadow-sm">
                            <h2 className="text-[40px] font-bold leading-[1.1] mb-[20px]">Need help with something in specific?</h2>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => {
                                    onSubmit(data);
                                    handleSubmit(data);  // Integrating with Formspree
                                })} className="space-y-[20px]">
                                    
                                    {/* Services */}
                                    <div className="">
                                        <FormLabel className='mb-[15px] block text-[16px] font-outfit font-light'>What service you want?</FormLabel>
                                        <div className="grid grid-cols-4 gap-[10px]">
                                            {services.map((service, index) => (
                                                <FormField
                                                    key={index}
                                                    control={form.control}
                                                    name="services"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="form-check">
                                                                <Input
                                                                    {...field}
                                                                    value={service.heading}
                                                                    type='radio'
                                                                    id={`form--id--${index}`}
                                                                    className='form-check-input hidden'
                                                                    onChange={() => {
                                                                        field.onChange(service.heading);
                                                                    }}
                                                                />
                                                                <Label
                                                                    htmlFor={`form--id--${index}`}
                                                                    className="form-check-label cursor-hover py-[15px] px-[10px] rounded-[13px] bg-center bg-cover flex flex-col justify-center"
                                                                    style={{ backgroundImage: `url('${ServiceOverlay.src}')` }}
                                                                >
                                                                    <div className="mb-[5px] text-center">
                                                                        <span className="mx-auto h-[55px] w-[55px] min-w-[55px] rounded-full overflow-hidden bg-white bg-opacity-10 inline-block">
                                                                            {service.thumbnail ?
                                                                                <Image src={ service.thumbnail } className='w-full h-full object-cover' alt={service.heading} />
                                                                            :
                                                                                <Image src={ServiceWordPress} className='w-full h-full object-cover' alt={service.heading} />
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <h2 className="font-hind font-light text-center text-xs uppercase tracking-widest">{service.heading}</h2>
                                                                </Label>
                                                            </div>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-[20px]">
                                        <FormField
                                            control={form.control}
                                            name="full_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[16px] font-outfit font-light'>Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Full Name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[16px] font-outfit font-light'>Email</FormLabel>
                                                    <FormControl>
                                                        <Input type='email' placeholder="Email" {...field} />
                                                    </FormControl>
                                                    <FormDescription>We will use this email to contact you.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-[20px]">
                                        <FormField
                                            control={form.control}
                                            name="skype_whatsapp"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[16px] font-outfit font-light'>Skype/Whatsapp</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="xxx xxxx xxxx" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[16px] font-outfit font-light'>Phone</FormLabel>
                                                    <FormControl>
                                                        <Input type='text' placeholder="xxx xxxx xxxxx" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>


                                    <FormField
                                        control={form.control}
                                        name="meeting_date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className='mb-[5px] text-[16px] font-outfit font-light'>Please select best time for a meeting:</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full h-[50px] px-6 pe-4 py-2 text-sm text-left font-normal rounded border border-black bg-background hover:bg-background hover:text-white",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(new Date(field.value), "PPP")
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                                <CalendarClock  className="ml-auto h-6 w-6 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={(date) => field.onChange(date?.toISOString())}
                                                            disabled={(date) =>
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                            className='bg-white text-black'
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormDescription>
                                                    Your date of birth is used to calculate your age.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                            control={form.control}
                                            name="message"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[16px] font-outfit font-light'>Tell us more</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Tell us more.." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                    <Button type="submit" className='min-w-[200px] max-w-full'>Submit</Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                    <div className="grid__item">
                        <div className="p-[30px] rounded-[12px] shadow-sm bg-card">
                            <h2 className="text-[40px] font-bold leading-[1.1] mb-[20px]">Frequently Asked Questions</h2>
                            <div className="mb-[30px] space-y-[15px] text-white text-opacity-60">
                                <p>Got a unique technical puzzle? We're here to help! Our specialized consulting services offer friendly, expert advice to help you navigate any obstacles you're facing. Using our deep understanding of the latest tech trends and solutions, we'll craft a plan tailored just for you</p>
                                <p>Let's team up and turn those challenges into victories</p>
                            </div>

                                <Accordion type="single" collapsible className="w-full">
                                    {faqs && faqs.map((faq, index) =>(
                                        <AccordionItem key={index} value={`item-${index}`}>
                                            <AccordionTrigger>{faq.heading}</AccordionTrigger>
                                            <AccordionContent>
                                            Yes. It adheres to the WAI-ARIA design pattern.
                                            </AccordionContent>
                                        </AccordionItem>                                        
                                    ))}
                                </Accordion>
                            </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ContactForm;
