import { useState, useRef, useMemo } from "react";
import { PawPrint, Plus, Dog, Cat, Bird, Rabbit, Trash2, Camera, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/triage/PaywallModal";
import { useUpgradeTriggers } from "@/hooks/useUpgradeTriggers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useLanguage } from "@/contexts/LanguageContext";

const speciesIcons: Record<string, typeof Dog> = {
  dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, other: PawPrint,
};

function PetsPage() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [newPet, setNewPet] = useState({ name: "", species: "dog", breed: "", age: "", weight: "" });
  const [touched, setTouched] = useState({ name: false });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { pets, activePet, setActivePetId, isLoading } = useActivePet();

  const handleAddPetClick = () => {
    if (isSecondPetBlocked && pets.length >= 1) {
      setShowPaywall(true);
    } else {
      setIsOpen(true);
    }
  };

  const nameError = useMemo(() => {
    if (!touched.name) return null;
    if (!newPet.name.trim()) return t("pets.nameRequired");
    if (newPet.name.length > 50) return t("pets.nameTooLong");
    return null;
  }, [newPet.name, touched.name, t]);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { isSecondPetBlocked } = useUpgradeTriggers(session?.user?.id);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => { setPhotoPreview(event.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (userId: string, petId: string): Promise<string | null> => {
    if (!photoFile) return null;
    const fileExt = photoFile.name.split('.').pop();
    const filePath = `${userId}/${petId}.${fileExt}`;
    const { error } = await supabase.storage.from('pet-photos').upload(filePath, photoFile, { upsert: true });
    if (error) return null;
    return filePath;
  };

  const addPetMutation = useMutation({
    mutationFn: async (pet: typeof newPet) => {
      setIsUploading(true);
      const { data: newPetData, error } = await supabase.from("pets").insert({
        name: pet.name, species: pet.species, breed: pet.breed || null,
        age: pet.age ? parseInt(pet.age) : null, weight: pet.weight ? parseFloat(pet.weight) : null,
        owner_id: session?.user.id,
      }).select().single();
      if (error) throw error;
      if (photoFile && session?.user.id) {
        const photoUrl = await uploadPhoto(session.user.id, newPetData.id);
        if (photoUrl) await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", newPetData.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      setIsOpen(false);
      setNewPet({ name: "", species: "dog", breed: "", age: "", weight: "" });
      setTouched({ name: false });
      setPhotoFile(null); setPhotoPreview(null); setIsUploading(false);
      toast({ title: t("pets.petAdded"), description: t("pets.petAddedDesc") });
    },
    onError: () => {
      setIsUploading(false);
      toast({ title: t("general.error"), description: t("general.error"), variant: "destructive" });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: async (petId: string) => {
      const { error } = await supabase.from("pets").delete().eq("id", petId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      toast({ title: t("pets.petRemoved"), description: t("pets.petRemovedDesc") });
    },
    onError: () => {
      toast({ title: t("general.error"), description: t("general.error"), variant: "destructive" });
    },
  });

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <div className="p-4 rounded-[28px] bg-primary/10 mb-6">
          <PawPrint className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">{t("pets.signInManage")}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">{t("pets.signInDesc")}</p>
        <Button onClick={() => window.location.href = "/auth"} size="lg">{t("general.signIn")}</Button>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen">
      <PageHeader
        title={t("pets.title")}
        icon={<PawPrint className="h-4 w-4 text-primary" />}
        rightContent={
          <Button size="sm" onClick={handleAddPetClick}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("pets.addPet")}
          </Button>
        }
      />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
        <DialogContent className="mx-5 rounded-[20px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">{t("pets.addNewPet")}</DialogTitle>
            <DialogDescription className="sr-only">{t("pets.fillDetails")}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5 py-4 -mx-6 px-6">
            <div className="flex justify-center">
              <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer group">
                <Avatar className="h-20 w-20 rounded-2xl">
                  <AvatarImage src={photoPreview || undefined} alt="Pet photo" className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-muted">
                    <Camera className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-2xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            <p className="text-xs text-center text-muted-foreground -mt-2">{t("pets.tapPhoto")}</p>
            <div>
              <Label htmlFor="name" className="text-muted-foreground">{t("pets.name")} *</Label>
              <Input id="name" value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                onBlur={() => setTouched(t => ({ ...t, name: true }))} placeholder="Buddy"
                className={`mt-1.5 rounded-xl h-11 ${nameError ? 'ring-2 ring-destructive' : ''}`} maxLength={50} />
              {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
            </div>
            <div>
              <Label htmlFor="species" className="text-muted-foreground">{t("onboarding.species")} *</Label>
              <Select value={newPet.species} onValueChange={(v) => setNewPet({ ...newPet, species: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="dog">{t("species.dog.plain")}</SelectItem>
                  <SelectItem value="cat">{t("species.cat.plain")}</SelectItem>
                  <SelectItem value="bird">{t("species.bird.plain")}</SelectItem>
                  <SelectItem value="rabbit">{t("species.rabbit.plain")}</SelectItem>
                  <SelectItem value="other">{t("species.other.plain")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="breed" className="text-muted-foreground">{t("onboarding.breed")}</Label>
              <Input id="breed" value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                placeholder="Golden Retriever" className="mt-1.5 rounded-xl h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="age" className="text-muted-foreground">{t("onboarding.age")}</Label>
                <Input id="age" type="number" value={newPet.age} onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                  placeholder="3" className="mt-1.5 rounded-xl h-11" />
              </div>
              <div>
                <Label htmlFor="weight" className="text-muted-foreground">{t("onboarding.weight")}</Label>
                <Input id="weight" type="number" step="0.1" value={newPet.weight}
                  onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                  placeholder="25" className="mt-1.5 rounded-xl h-11" />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 pt-4 border-t border-border">
            <Button onClick={() => addPetMutation.mutate(newPet)}
              disabled={!newPet.name || addPetMutation.isPending || isUploading}
              className="w-full h-11 active:scale-[0.98] transition-transform">
              {addPetMutation.isPending || isUploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("pets.adding")}</>
              ) : t("pets.addPet")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-5 py-5 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="apple-card animate-pulse p-5">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-muted" />
                  <div className="space-y-3">
                    <div className="h-4 w-28 bg-muted rounded-lg" />
                    <div className="h-3 w-36 bg-muted rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
              <PawPrint className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{t("pets.noPets")}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t("pets.noPetsDesc")}</p>
            <Button onClick={() => setIsOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              {t("pets.addFirstPet")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pets.map((pet) => {
              const Icon = speciesIcons[pet.species] || PawPrint;
              const isActive = pet.id === activePet?.id;
              return (
                <button key={pet.id} onClick={() => setActivePetId(pet.id)}
                  className={`w-full text-left apple-card p-4 hover:shadow-apple-lg transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-xl">
                        <AvatarImage src={pet.photo_url || undefined} alt={pet.name} className="object-cover" />
                        <AvatarFallback className="rounded-xl bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-foreground">{pet.name}</h3>
                          {isActive && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t("general.active")}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {pet.breed && `${pet.breed} · `}
                          {pet.age && `${pet.age} ${t("pets.years")} · `}
                          {pet.weight && `${pet.weight} ${t("pets.lbs")}`}
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"
                          className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl mx-5">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("pets.removePet", { name: pet.name })}</AlertDialogTitle>
                          <AlertDialogDescription>{t("pets.removeDesc", { name: pet.name })}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">{t("general.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePetMutation.mutate(pet.id)}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("general.remove")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Paywall Modal for second pet gate */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        onSubscribe={() => setShowPaywall(false)}
        triggerContext="Premium allows multiple pets and full household tracking."
      />
    </PageTransition>
  );
}

export default PetsPage;
