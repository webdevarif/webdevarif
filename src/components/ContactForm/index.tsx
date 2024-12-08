"use client";
import React from 'react';
// Make sure to run npm install @formspree/react
// For more help visit https://formspr.ee/react-help
// import { useForm as useFormspree, ValidationError } from '@formspree/react';
import { useForm as useFormspree } from '@formspree/react';
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

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
import { CalendarClock } from 'lucide-react';
// import { CalendarClock, CalendarDays, CheckCheck, CheckIcon } from 'lucide-react';
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
        // console.log(meeting_date, data);
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
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        { 
            heading: 'Woocommerce', 
            thumbnail: ServiceWoocommerce,
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' }, 
            ]
        },
        { 
            heading: 'Shopify', 
            thumbnail: ServiceShopify,
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        { 
            heading: 'NextJs', 
            thumbnail: ServiceNextJs,
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        { 
            heading: 'Html/Tailwind', 
            thumbnail: ServiceTailwind,
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        { 
            heading: 'Html/Bootstrap', 
            thumbnail: ServiceBootstrap,
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
    ];

    return (
        <section className='contact-area bg-slate-50 py-[100px]'>
            <div className="container">
                <div className="mb-[5rem]">
                    <h2 className="text-[25px] md:text-[30px] xl:text-[40px] font-bold font-unbounded uppercase leading-[1.2] mb-4">Need help with <br />something in specific?</h2>
                </div>
                <div className="">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => {
                            onSubmit(data);
                            handleSubmit(data);  // Integrating with Formspree
                        })}>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="col-span-1 md:order-last">
                                    <div className="">
                                        <FormLabel className='block font-hind mb-4 font-semibold uppercase'>What service you want?</FormLabel>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {services.map((service, index) => (
                                            <FormField
                                                key={index}
                                                control={form.control}
                                                name="services"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <div className="form-check [&>.form-check-input:checked~.form-check-label]:border-black [&>.form-check-input:checked~.form-check-label>.svg-check]:opacity-100 [&>.form-check-input:checked~.form-check-label>.svg-check]:scale-100">
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
                                                            className="form-check-label cursor-hover relative py-[15px] px-[10px] rounded-none border-2 cursor-pointer border-black/5 transition-all duration-300 bg-center bg-cover flex flex-col justify-center aspect-square bg-white"
                                                        >
                                                            <svg className='w-8 h-8 svg-check duration-300 ease-linear transition-all absolute top-0 end-0 opacity-0 scale-50' stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm108.25 138.29-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32 122.59-145.91a16 16 0 0 1 24.5 20.58z"></path></svg>
                                                            <div className="mb-3 text-center">
                                                                <span className="mx-auto h-[55px] w-[55px] min-w-[55px] rounded-full overflow-hidden bg-white bg-opacity-10 inline-block">
                                                                    { service.thumbnail ? 
                                                                        <Image src={ service.thumbnail } className='w-full h-full object-cover' alt={service.heading} /> :
                                                                        <Image src={ServiceWordPress} className='w-full h-full object-cover' alt={service.heading} />
                                                                    }
                                                                </span>
                                                            </div>
                                                            <h2 className="text-center font-optima-pro font-semibold text-xs uppercase tracking-widest">{service.heading}</h2>
                                                        </Label>
                                                    </div>
                                                </FormItem>
                                                )} />
                                            ))} 
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-1 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="full_name"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Full Name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )} />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Email</FormLabel>
                                                <FormControl>
                                                    <Input type='email' placeholder="Email" {...field} />
                                                </FormControl>
                                                <FormDescription className='text-xs'>We will use this email to contact you.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                            )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-[20px]">
                                        <FormField
                                            control={form.control}
                                            name="skype_whatsapp"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Skype/Whatsapp</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="xxx xxxx xxxx" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )} />
                                        <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Phone</FormLabel>
                                            <FormControl>
                                                <Input type='text' placeholder="xxx xxxx xxxxx" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )} />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="meeting_date"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Please select best time for a meeting:</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full h-[50px] px-6 pe-4 py-2 text-sm text-left font-normal rounded-none border-2 border-black bg-background hover:bg-background hover:text-black",
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
                                                            date < new Date() || date < new Date("1900-01-01")
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
                                    )} />
                                    <FormField
                                        control={form.control}
                                        name="message"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='block font-hind mb-4 font-semibold uppercase'>Tell us more</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Tell us more.." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}/>
                                    <Button type="submit" className='min-w-[8rem] text-md uppercase h-auto py-3 max-w-full'>Submit</Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </section>
    );
}

export default ContactForm;
