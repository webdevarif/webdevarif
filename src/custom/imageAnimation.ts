import { gsap } from "gsap";

// Function to initialize image animation
export const imageAnimation = () => {
  const revealContainers = document.querySelectorAll<HTMLElement>(".reveal");

  revealContainers.forEach((container) => {
    const image = container.querySelector("img");
    if (!image) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        toggleActions: "play none none none",
      },
    });

    tl.set(container, { autoAlpha: 1 });
    tl.from(container, 1.5, { xPercent: -100, ease: "Power2.out" });
    tl.from(image, 1.5, { xPercent: 100, scale: 1.3, delay: -1.5, ease: "Power2.out" });
  });

const inviewContainers = document.querySelectorAll<HTMLElement>(".inview");
// Inview
inviewContainers.forEach((container) => {
  // Select the first occurrence of iframe, img, figure, or video within the current container
  const element = container.querySelector(".inview-wrapper");
  // Extract the delay attribute, defaulting to "0" if not set
  const delayAttr = container.getAttribute("delay") || "0";
  
  if (!element) return; // Exit if there's no matching element in the container
  

  // Apply GSAP animation to the selected element
  gsap.fromTo(
    element,
    { scale: 1.2 },  // Starting scale
    { 
      scale: 1,      // Ending scale
      duration: 2,
      delay: parseFloat(delayAttr), // Convert the delay attribute to a number
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,       // Use the container as the trigger for the scroll event
        start: 'top bottom',      // Animation starts when the top of the container hits the bottom of the viewport
      },
      onStart: function () {
        container.classList.add('animate'); // Add 'animated' class when the animation starts
      }
    }
  );
});

  // Parallax effect setup
  const imageContainers = document.querySelectorAll<HTMLElement>(".wgp-parallax-anim");
  imageContainers.forEach((container) => {
    const image = container.querySelector("img");
    if (!image) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        scrub: 0.5,
      },
    });

    tl.from(image, {
      yPercent: -30,
      ease: "none",
    }).to(image, {
      yPercent: 30,
      ease: "none",
    });
  });
};
