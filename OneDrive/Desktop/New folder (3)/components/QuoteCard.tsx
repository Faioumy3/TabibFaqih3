import React from 'react';
import { Quote } from '../types';

interface QuoteCardProps {
  quote: Quote;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote }) => {
  return (
    <div className="relative bg-white border-r-4 border-r-teal-500 border-y border-l border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-300 w-full mb-1.5 overflow-hidden group mx-auto">
      {/* Decorative quotes background watermark */}
      <div className="absolute -left-2 -top-1 text-[4rem] text-teal-50 opacity-40 font-serif select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
        "
      </div>
       <div className="absolute -right-2 -bottom-2 text-[4rem] text-teal-50 opacity-40 font-serif select-none pointer-events-none rotate-180">
        ”
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-gray-800 text-base font-bold leading-relaxed mb-1.5 font-amiri">
          "{quote.text}"
        </p>
        <div className="w-full flex justify-center">
          <p className="text-teal-700 text-[11px] font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 font-cairo">
            - {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
};