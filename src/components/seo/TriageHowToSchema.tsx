import { useEffect } from "react";

/**
 * Injects HowTo JSON-LD structured data for the triage page.
 * This can earn rich snippets in Google for "how to check pet symptoms" queries.
 */
export function TriageHowToSchema() {
  useEffect(() => {
    const scriptId = "triage-howto-jsonld";

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Check Your Pet's Symptoms with AI Triage",
      description: "Use PetNurse AI's free symptom checker to assess your dog or cat's health in minutes. Get a structured clinical report with urgency classification.",
      totalTime: "PT5M",
      tool: [
        { "@type": "HowToTool", name: "PetNurse AI Symptom Checker" },
      ],
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Select your pet",
          text: "Choose the pet you want to assess from your profile, or describe the species and breed.",
          url: "https://petnurseai.com/triage",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Describe the symptoms",
          text: "Enter the primary symptoms your pet is experiencing. Be as specific as possible about what you've observed.",
          url: "https://petnurseai.com/triage",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Answer follow-up questions",
          text: "The AI engine asks targeted clinical questions based on your pet's symptoms to build a complete picture.",
          url: "https://petnurseai.com/triage",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Complete the toxicology check",
          text: "If relevant, the system cross-references the EPA toxicology database for potential exposures.",
          url: "https://petnurseai.com/triage",
        },
        {
          "@type": "HowToStep",
          position: 5,
          name: "Review your clinical report",
          text: "Receive a structured triage report with urgency classification (Red/Yellow/Green), differential possibilities, and recommended next steps.",
          url: "https://petnurseai.com/triage",
        },
        {
          "@type": "HowToStep",
          position: 6,
          name: "Share with your veterinarian",
          text: "Download or share the report with your vet to help guide the consultation.",
          url: "https://petnurseai.com/triage",
        },
      ],
    });

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, []);

  return null;
}
