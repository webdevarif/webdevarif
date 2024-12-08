import React from 'react';
import ContactForm from '@/components/ContactForm'
import PageLayout from '@/Providers/PageLayout';
import PrimaryLayout from '@/Providers/PrimaryLayout';

const ContactPage = () => {
  return (
    <PrimaryLayout>
      <PageLayout>
          <ContactForm />
      </PageLayout>
    </PrimaryLayout>
  )
}

export default ContactPage