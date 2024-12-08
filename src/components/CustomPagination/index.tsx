import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination";

  interface CustomPaginationProps {
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
  }
  
  const CustomPagination: React.FC<CustomPaginationProps> = ({ currentPage, totalPages, setPage }) => {
    const handlePreviousClick = () => {
      if (currentPage > 1) {
        setPage(currentPage - 1);
      }
    };
  
    const handleNextClick = () => {
      if (currentPage < totalPages) {
        setPage(currentPage + 1);
      }
    };
  
    return (
      <Pagination>
        <PaginationContent className='gap-x-3'>
          <PaginationItem>
            <PaginationPrevious className={`rounded-lg border-2 border-dark text-dark hover:text-white hover:bg-dark min-w-[6rem] uppercase font-bold ${currentPage === 1 ? 'opacity-25 pointer-events-none' : 'cursor-pointer'}`} onClick={handlePreviousClick} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext className={`rounded-lg border-2 border-dark text-dark hover:text-white hover:bg-dark min-w-[6rem] uppercase font-bold ${currentPage === totalPages ? 'opacity-25 pointer-events-none' : 'cursor-pointer'}`} onClick={handleNextClick} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  export default CustomPagination;