
import React from 'react'
import Hero from './Hero'
import Social from './Social'
import ContactForm from '@/components/ContactForm'
import ClientReviews from './ClientReviews'
import Partners from './Partners'
import RecentProjects from './RecentProjects'
import BlogInsight from './BlogInsight'
import Projects from './Projects'
import AboutMe from './AboutMe'

const HomePage = () => {
  return (
    <div>
      <Hero />
      {/* <Partners />
      <RecentProjects />
      <ClientReviews />
      
      <Social /> */}
      
      <AboutMe />
      <Projects />
      <ContactForm />
      <BlogInsight />
    </div>
  )
}

export default HomePage