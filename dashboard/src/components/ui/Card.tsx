import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className, ...props }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`} {...props}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  );
};