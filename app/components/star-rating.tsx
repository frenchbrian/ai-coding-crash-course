import { useState } from "react";
import { useFetcher } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

const STARS = [1, 2, 3, 4, 5];

/** Read-only display of a course's average rating (supports partial stars). */
export function StarRatingDisplay({
  average,
  count,
  className,
  starClassName = "size-4",
}: {
  average: number | null;
  count: number;
  className?: string;
  starClassName?: string;
}) {
  if (average === null || count === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No ratings yet
      </span>
    );
  }

  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? "rating" : "ratings"}`}
    >
      <span className="flex items-center" aria-hidden>
        {STARS.map((star) => {
          const fill = Math.max(0, Math.min(1, average - (star - 1)));
          return (
            <span key={star} className="relative inline-block">
              <Star className={cn(starClassName, "text-muted-foreground/40")} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(starClassName, "fill-amber-400 text-amber-400")}
                />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-sm font-medium text-foreground">
        {average.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

/** Interactive 1–5 star input that submits to the current route's action. */
export function StarRatingInput({ currentRating }: { currentRating: number | null }) {
  const fetcher = useFetcher<{ error?: string }>();
  const [hovered, setHovered] = useState<number | null>(null);

  const pending = fetcher.formData?.get("rating");
  const selected = pending ? Number(pending) : currentRating;
  const shown = hovered ?? selected ?? 0;

  return (
    <fetcher.Form method="post" className="space-y-1">
      <input type="hidden" name="intent" value="rate" />
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Rate this course"
        onMouseLeave={() => setHovered(null)}
      >
        {STARS.map((star) => (
          <button
            key={star}
            type="submit"
            name="rating"
            value={star}
            role="radio"
            aria-checked={selected === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={fetcher.state !== "idle"}
            onMouseEnter={() => setHovered(star)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                star <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {selected ? `You rated this ${selected} / 5. Click to change.` : "Click a star to rate."}
      </p>
      {fetcher.data?.error && (
        <p className="text-xs text-destructive">{fetcher.data.error}</p>
      )}
    </fetcher.Form>
  );
}
