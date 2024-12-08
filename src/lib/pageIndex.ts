import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export const usePageIndex = (baseRoute: string, initialPage: number = 1) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageIndex, setPageIndex] = useState(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam) : initialPage;
  });

  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam && pageParam !== pageIndex.toString()) {
      setPageIndex(parseInt(pageParam));
    }
  }, [searchParams, pageIndex]);

  const changePage = (newPage: number) => {
    setPageIndex(newPage);
    
    const searchParams = new URLSearchParams();
    searchParams.set('page', newPage.toString());
    
    router.push(`${baseRoute}?${searchParams.toString()}`);
  };

  return { pageIndex, changePage };
};
