import { memo, useState, useCallback, useMemo } from "react";
import { Dog, Cat, Bird, Rabbit, PawPrint, ChevronDown, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat" | "bird" | "rabbit" | "other";
  breed?: string | null;
  photo_url?: string | null;
}

interface PetSelectorProps {
  pets: Pet[];
  selectedPet: Pet | null;
  onSelect: (pet: Pet | null) => void;
  onAddPet?: () => void;
}

const speciesIcons = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  other: PawPrint,
} as const;

const getIcon = (species: Pet["species"]) => {
  return speciesIcons[species] || PawPrint;
};

export const PetSelector = memo(function PetSelector({ 
  pets, 
  selectedPet, 
  onSelect, 
  onAddPet 
}: PetSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((pet: Pet) => {
    onSelect(pet);
    setOpen(false);
  }, [onSelect]);

  const handleAddPet = useCallback(() => {
    onAddPet?.();
    setOpen(false);
  }, [onAddPet]);

  const SelectedIcon = useMemo(() => 
    selectedPet ? getIcon(selectedPet.species) : null, 
    [selectedPet]
  );

  if (pets.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onAddPet}
        className="rounded-xl h-10 px-3 gap-2"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">Add Pet</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-2 rounded-2xl hover:bg-muted/50 gap-3"
        >
          {selectedPet && SelectedIcon ? (
            <>
              <Avatar className="h-10 w-10 rounded-xl">
                <AvatarImage src={selectedPet.photo_url || undefined} alt={selectedPet.name} />
                <AvatarFallback className="rounded-xl bg-primary/10">
                  <SelectedIcon className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{selectedPet.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedPet.species}</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <PawPrint className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Select Pet</p>
                <p className="text-xs text-muted-foreground">Choose your pet</p>
              </div>
            </>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl p-2">
        {pets.map((pet) => {
          const Icon = getIcon(pet.species);
          return (
            <DropdownMenuItem
              key={pet.id}
              onClick={() => handleSelect(pet)}
              className="rounded-xl p-3 cursor-pointer"
            >
              <Avatar className="h-10 w-10 rounded-xl mr-3">
                <AvatarImage src={pet.photo_url || undefined} alt={pet.name} />
                <AvatarFallback className="rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{pet.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {pet.breed || pet.species}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
        {onAddPet && (
          <DropdownMenuItem
            onClick={handleAddPet}
            className="rounded-xl p-3 cursor-pointer text-primary"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mr-3">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Add New Pet</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
