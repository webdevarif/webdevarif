"use client";

import React, { useContext } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TocContext } from './TocContext';

const HIDDEN_OFFSET = 0.05;

const Toc = () => {
    const { scrollYProgress } = useScroll();
    const progressHeight = useTransform( scrollYProgress, [0, 1], ["0%", "100%"]);
    const { sections, activeSection } = useContext( TocContext );
    const [ showToc, setShowToc] = React.useState( activeSection >=0 );
    scrollYProgress.on('change', (val) =>{
        setShowToc( activeSection >= 0 && val >= HIDDEN_OFFSET && val <= 1- HIDDEN_OFFSET);
    });

    return (
        <div className="h-full px-4">
            <motion.div className="sticky top-20 h-[80vh] py-32 flex gap-4"
                initial={{ opacity: 0, display: 'none' }}
                animate={{ opacity: showToc ? 1 : 0, display: showToc ? 'flex' : 'none' }}
            >
                <div className="h-full w-0.5 bg-slate-300 rounded-full overflow-hidden">
                    <motion.div
                        className="bg-neutral-800 w-full origin-top"
                        style={{ height: progressHeight }}
                    />
                </div>
                <div className="hidden lg:flex flex-col gap-6 text-sm">
                    { sections.map(({ id, title }) =>(
                    <span key={id} className={`cursor-pointer transition-colors duration-200 ${activeSection === id ? 'text-slate-800' : 'text-slate-300'}`}
                        onClick={() => document.getElementById(`section-${ id }`)?.scrollIntoView({ behavior: 'smooth' }) 
                    }>
                        {title}
                    </span>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Toc;
