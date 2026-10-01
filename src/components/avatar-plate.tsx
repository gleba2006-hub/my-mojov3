import { characterSrc, petSrc } from "@/components/brand";

const stages = ["ניצן", "צומח", "בטוח", "גיבור", "אגדה"];

export function AvatarPlate({ stage, pet, gender }: { stage: number; pet?: string; gender?: string | null }) {
  const safe = Math.min(5, Math.max(1, stage));
  return (
    <div className="flex items-center gap-3">
      <img src={characterSrc(gender, safe)} alt="" className="h-20 w-20 object-contain" />
      <img src={petSrc(pet ?? gender ?? "a")} alt="" className="h-12 w-12 object-contain" />
      <div>
        <p className="text-sm font-black">{stages[safe - 1]}</p>
        <p className="text-xs text-muted-foreground">שלב {safe} מתוך 5 · כל 3 רמות</p>
        {pet ? <p className="text-xs text-muted-foreground">{pet}</p> : null}
      </div>
    </div>
  );
}
