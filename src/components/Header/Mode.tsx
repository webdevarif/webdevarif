"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';
import { VscColorMode } from 'react-icons/vsc';

const ModeChanger = () => {
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    
    const toggleTheme = () => {
        setTheme(resolvedTheme === "light" ? "dark" : "light");
      };
  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <Button variant={'ghost'} size={'icon'} className='h-10 w-10 rounded-full' onClick={toggleTheme}>
      <VscColorMode className="w-5 h-5 rotate-45" />
    </Button>
  )
}

export default ModeChanger;
