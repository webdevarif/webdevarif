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
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious className={`uppercase font-unbounded rounded-none ${currentPage === 1 ? 'opacity-25 pointer-events-none' : 'cursor-pointer'}`} onClick={handlePreviousClick} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext className={`uppercase font-unbounded rounded-none ${currentPage === totalPages ? 'opacity-25 pointer-events-none' : 'cursor-pointer'}`} onClick={handleNextClick} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  export default CustomPagination;