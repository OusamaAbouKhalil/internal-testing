"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationAdvanced({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2;

    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      pages.push(i);
    }

    const firstPage = pages[0];
    if (typeof firstPage === 'number' && firstPage > 1) {
      if (firstPage > 2) pages.unshift("...");
      pages.unshift(1);
    }
    const lastPage = pages[pages.length - 1];
    if (typeof lastPage === 'number' && lastPage < totalPages) {
      if (lastPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Prev
      </Button>

      {pages.map((p, i) =>
        typeof p === "number" ? (
          <Button
            key={i}
            variant={p === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ) : (
          <span key={i} className="px-2 text-muted-foreground">…</span>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}
