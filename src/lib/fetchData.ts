import useSWRInfinite from 'swr/infinite';
import fetcher from './fetcher';
import { ProjectsListDataProps, ProjectPostProps } from '@/types/projects';

// PROJECTS
export const LoadMoreProjects = (query: string) => {
  const getKey = (pageIndex: number) => {
    return `${process.env.apiURL}/projects?${query}&current-page=${pageIndex + 1}`;
  };
  const { data, error, size, setSize, isValidating, isLoading } = useSWRInfinite<ProjectsListDataProps>(getKey, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const changePage = ( newPage: number ) => {
    setSize(newPage); 
  };

  const isLoadingInitialData = !data && !error;
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === 'undefined');

  const projects: ProjectPostProps[] = data ? data.flatMap(page => page.posts) : [];
  const isLast = data ? (data[data.length - 1].current_page >= data[data.length - 1].total_pages) : false;

  return { projects, changePage, isLoadingMore, size, setSize, isValidating, error, isLast, isLoading };
};
