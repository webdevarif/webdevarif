
import React from 'react'
import Hero from './Hero'
import Social from './Social'
import ContactForm from './ContactForm'
import ClientReviews from './ClientReviews'
import Partners from './Partners'
import RecentProjects from './RecentProjects'

const HomePage = () => {
  return (
    <div>
      <Hero />
      <Partners />
      <RecentProjects />
      <ClientReviews />
      <ContactForm />
      <Social />
    </div>
  )
}

export default HomePage