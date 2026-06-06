import React, { useEffect } from 'react';
import { usePageTitle } from './PageTitleContext';

const PageWrapper = ({ children, title }) => {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    if (title) {
      setTitle(title);
    }
  }, [title, setTitle]);

  return <div className="animate-fade-in">{children}</div>;
};

export default PageWrapper;
