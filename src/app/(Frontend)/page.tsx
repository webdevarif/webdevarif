import React from 'react';
import Hero from './Hero';
import BlogInsight from './BlogInsight';
import Projects from './Projects';
import AboutMe from './AboutMe';
import PromoteBox from './Promote';
import PrimaryLayout from '@/Providers/PrimaryLayout';
import Services from './Services';
import Pricing from './Pricing';
import Testimonials from './Testimonials';

const HomePage = () => {
  return (
    <PrimaryLayout>
      <Hero />      
      <AboutMe />
      <Services />
      <Projects />
      <Testimonials />
      <Pricing />
      <BlogInsight />
      <PromoteBox />
    </PrimaryLayout>
  )
}

export default HomePage;