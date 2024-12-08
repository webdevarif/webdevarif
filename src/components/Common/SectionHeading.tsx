import { cn } from '@/lib/utils';
import { Heading } from './Heading';

const SectionHeading: React.FC<{ caption?: string, title?: string, description?: string, className?: string }> = ({ caption, title, description, className }) => {
  return (
    <div className={cn('mb-[3rem] mx-auto text-center max-w-[40rem]', className)}>
      {caption && (
        <div className='mb-3'>
          <span className='uppercase border border-foreground/25 tracking-widest font-barlow font-semibold px-8 py-2 inline-block rounded-full'>
            {caption}
          </span>
        </div>
      )}
      {title && <Heading as='h2' size='5xl'>{title}</Heading>}
      {description && <div className='mt-3'>{description}</div>}
    </div>
  );
};

export default SectionHeading;
