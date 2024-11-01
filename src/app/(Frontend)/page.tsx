
import React from 'react'
import Hero from './Hero'
import ContactForm from '@/components/ContactForm'
import BlogInsight from './BlogInsight'
import Projects from './Projects'
import AboutMe from './AboutMe'

const HomePage = () => {
  return (
    <div>
      <Hero />      
      <AboutMe />
      <Projects />
      <ContactForm />
      <BlogInsight />
    </div>
  )
}

export default HomePage