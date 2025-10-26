import React from 'react';

interface SermonSectionProps {
  title: string;
  children: React.ReactNode;
  id?: string;
}

export const SermonSection: React.FC<SermonSectionProps> = ({ title, children, id }) => {
  return (
    <section className="my-12" id={id}>
      <h2 className="font-sans font-bold text-3xl text-primary-dark border-b border-border pb-3 mb-6">
        {title}
      </h2>
      <div className="text-[1.3rem] leading-10 text-text-primary text-justify">
        {children}
      </div>
    </section>
  );
};
