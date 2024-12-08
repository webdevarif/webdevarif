import React, { createContext } from "react";

export type Section = {
    id: number;
    title: string;
};

type TocContextType = {
    sections: Section[];
    registerSection: (_: Section) => void;
    activeSection: number;
    setActiveSection: (_: number) => void;
};

export const TocContext = createContext<TocContextType>({
    sections: [],
    registerSection: () => {},
    activeSection: 0,
    setActiveSection: () =>{},
});

export const useTocContextValues = () =>{
    const [ activeSection, setActiveSection ] = React.useState(-1);
    const [ sections, setSections ] = React.useState<Section[]>([]);

    const registerSection = ( section: Section ) =>{
        setSections((val) => val.concat([section]));
    };

    const processSections = ( sections: Section[]) =>{
        const ids = sections.map(({ id }) =>id);
        const uniqueSections = sections.filter(({ id }, index) => !ids.includes(id, index + 1))
        .sort((a, b) => a.id - b.id);

        return uniqueSections;
    }

    return {
        values: {
            sections: processSections(sections),
            registerSection,
            activeSection,
            setActiveSection,
        }
    }
}