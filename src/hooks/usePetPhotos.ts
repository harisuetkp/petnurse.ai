import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for a pet photo stored in the private pet-photos bucket.
 * Returns null if no photo_url or if signing fails.
 */
export async function getSignedPetPhotoUrl(photoUrl: string | null | undefined): Promise<string | null> {
  if (!photoUrl) return null;
  // If it's already a full URL (legacy or external), return as-is
  if (photoUrl.startsWith("http")) return photoUrl;
  
  const { data, error } = await supabase.storage
    .from("pet-photos")
    .createSignedUrl(photoUrl, 3600); // 1 hour expiry

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Enrich an array of pets with signed photo URLs.
 */
export async function enrichPetsWithSignedUrls<T extends { photo_url?: string | null }>(
  pets: T[]
): Promise<T[]> {
  return Promise.all(
    pets.map(async (pet) => {
      const signedUrl = await getSignedPetPhotoUrl(pet.photo_url);
      return { ...pet, photo_url: signedUrl };
    })
  );
}
