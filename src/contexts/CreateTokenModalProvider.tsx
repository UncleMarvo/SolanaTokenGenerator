import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CreateView } from '../views';

/**
 * Global Create Token Modal Context
 * Provides a centralized way to open/close the Create Token modal from any page
 */
interface CreateTokenModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CreateTokenModalContext = createContext<CreateTokenModalContextType | undefined>(undefined);

interface CreateTokenModalProviderProps {
  children: ReactNode;
}

export const CreateTokenModalProvider: React.FC<CreateTokenModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const value: CreateTokenModalContextType = {
    isOpen,
    openModal,
    closeModal,
  };

  return (
    <CreateTokenModalContext.Provider value={value}>
      {children}
      {/* Global Create Token Modal - renders when isOpen is true */}
      {isOpen && (
        <div className="new_loader relative h-full bg-slate-900">
          <CreateView setOpenCreateModal={closeModal} />
        </div>
      )}
    </CreateTokenModalContext.Provider>
  );
};

/**
 * Hook to use the Create Token Modal context
 * @returns CreateTokenModalContextType - The modal context with open/close functions
 */
export const useCreateTokenModal = (): CreateTokenModalContextType => {
  const context = useContext(CreateTokenModalContext);
  if (context === undefined) {
    throw new Error('useCreateTokenModal must be used within a CreateTokenModalProvider');
  }
  return context;
};
