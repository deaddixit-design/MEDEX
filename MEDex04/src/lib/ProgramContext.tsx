import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Program } from '../types';

interface ProgramContextType {
  activeProgram: Program | null;
  loading: boolean;
}

const ProgramContext = createContext<ProgramContextType>({
  activeProgram: null,
  loading: true,
});

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'programs'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setActiveProgram({ id: doc.id, ...doc.data() } as Program);
      } else {
        setActiveProgram(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProgramContext.Provider value={{ activeProgram, loading }}>
      {children}
    </ProgramContext.Provider>
  );
}

export const useProgram = () => useContext(ProgramContext);
