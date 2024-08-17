import { NextResponse } from "next/server";

export async function GET(){
    return NextResponse.json({
        list: [
            { label: "Ons verhaal", handle: "out-story", url: "/our-story" },
            { label: "Ontwerp", handle: "design", url: "/design" },
            { label: "Projecten", handle: "projects", url: "/projects" },
            { label: "Tevreden klanten", handle: "satisfied-customer", url: "/satisfied-customer" },
            { label: "Jobs", handle: "jobs", url: "/jobs" },
            { label: "Blogs", handle: "blogs", url: "/blogs" },
            { label: "Contact", handle: "contact", url: "/contact-us" }
        ]
    })
}