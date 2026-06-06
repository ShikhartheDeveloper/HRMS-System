import React, { createContext, useContext, useState } from 'react';

const PageTitleContext = createContext({
  title: 'Dashboard',
  setTitle: () => {}
});

export const PageTitleProvider = ({ children }) => {
  const [title, setTitle] = useState('Dashboard');

  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => useContext(PageTitleContext);
