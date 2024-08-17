'use client';
import React from 'react';
import { useEffect } from 'react';
import { gsap } from 'gsap';

const CustomCursor: React.FC = () => {
    useEffect(() => {
        const bigBall = document.querySelector('.cursor__ball--big') as HTMLElement;
        const smallBall = document.querySelector('.cursor__ball--small') as HTMLElement;
        const hoverables = document.querySelectorAll('.cursor-hover');

        const onMouseMove = (e: MouseEvent) => {
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;

            gsap.to(bigBall, {
                duration: 0.4,
                x: e.pageX - 15 + scrollX,
                y: e.pageY - 15 + scrollY
            });
            gsap.to(smallBall, {
                duration: 0.1,
                x: e.pageX - 5 + scrollX,
                y: e.pageY - 7 + scrollY
            });
        };

        const onMouseHover = () => {
            gsap.to(bigBall, {
                duration: 0.3,
                scale: 3,
                top: 20,
                left: 20
            });
        };

        const onMouseHoverOut = () => {
            gsap.to(bigBall, {
                duration: 0.3,
                scale: 1,
                top: 0,
                left: 0
            });
        };

        document.body.addEventListener('mousemove', onMouseMove);
        hoverables.forEach((hoverable) => {
            hoverable.addEventListener('mouseenter', onMouseHover);
            hoverable.addEventListener('mouseleave', onMouseHoverOut);
        });

        return () => {
            document.body.removeEventListener('mousemove', onMouseMove);
            hoverables.forEach((hoverable) => {
                hoverable.removeEventListener('mouseenter', onMouseHover);
                hoverable.removeEventListener('mouseleave', onMouseHoverOut);
            });
        };
    }, []);
    return (
        <div className="cursor">
            <div className="cursor__ball cursor__ball--big ">
                <svg height="30" width="30">
                    <circle cx="15" cy="15" r="12" strokeWidth="0"></circle>
                </svg>
            </div>

            <div className="cursor__ball cursor__ball--small">
                <svg height="10" width="10">
                    <circle cx="5" cy="5" r="4" strokeWidth="0"></circle>
                </svg>
            </div>
        </div>
    )
}

export default CustomCursor;