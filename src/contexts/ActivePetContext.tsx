import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enrichPetsWithSignedUrls } from "@/hooks/usePetPhotos";

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  age: number | null;
  weight: number | null;
}

interface ActivePetContextValue {
  pets: Pet[];
  activePet: Pet | null;
  setActivePetId: (id: string) => void;
  isLoading: boolean;
}

const ACTIVE_PET_KEY = "petnurse_active_pet_id";

const ActivePetContext = createContext<ActivePetContextValue>({
  pets: [],
  activePet: null,
  setActivePetId: () => {},
  isLoading: false,
});

export function ActivePetProvider({ children }: { children: ReactNode }) {
  const [activePetId, setActivePetIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PET_KEY)
  );

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species, breed, photo_url, age, weight")
        .eq("owner_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return enrichPetsWithSignedUrls(data as Pet[]);
    },
    enabled: !!session,
    staleTime: 30000,
  });

  // Auto-select first pet if none selected or selected pet no longer exists
  useEffect(() => {
    if (pets.length === 0) return;
    const exists = pets.some((p) => p.id === activePetId);
    if (!exists) {
      const firstId = pets[0].id;
      setActivePetIdState(firstId);
      localStorage.setItem(ACTIVE_PET_KEY, firstId);
    }
  }, [pets, activePetId]);

  const setActivePetId = useCallback((id: string) => {
    setActivePetIdState(id);
    localStorage.setItem(ACTIVE_PET_KEY, id);
  }, []);

  const activePet = pets.find((p) => p.id === activePetId) || pets[0] || null;

  return (
    <ActivePetContext.Provider value={{ pets, activePet, setActivePetId, isLoading }}>
      {children}
    </ActivePetContext.Provider>
  );
}

export function useActivePet() {
  return useContext(ActivePetContext);
}
