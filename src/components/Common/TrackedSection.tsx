import React, { HTMLProps, useContext, useEffect} from 'react'
import { TocContext } from './TocContext';
import { useScroll } from 'framer-motion';

const TrackedSection = ({ sectionId, tocTitle, isFirst = false, isLast = false, ...props } : { isFirst? : boolean, isLast?: boolean, sectionId: number, tocTitle: string } & HTMLProps<HTMLElement> ) => {
    const { registerSection, setActiveSection } = useContext(TocContext);

    useEffect(() =>{
        registerSection({ id: sectionId, title: tocTitle });
    }, [registerSection, sectionId, tocTitle]);
    
    const container = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: [ "start center", "end center" ],
    });

    scrollYProgress.on('change', (value) =>{
        if (value > 0 && value <1 ){
            setActiveSection(sectionId);
        }
        if (( value <= 0 && isFirst ) || ( value >= 1 && isLast )){
            setActiveSection(-1);
        }
    })
 
  return (
    <section ref={container} 
        style={{ scrollMargin: '40vh' }}
        id={`section-${ sectionId }`} {...props} 
    />
  );
}

export default TrackedSection
