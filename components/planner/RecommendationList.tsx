"use client";

import { useState } from "react";
import { Goal, Recommendation } from "@/lib/types";
import RecommendationCard from "@/components/planner/RecommendationCard";

interface RecommendationListProps {
  recommendations: Recommendation[];
  currentGoal: Goal | null;
}

export default function RecommendationList({ recommendations, currentGoal }: RecommendationListProps) {
  const [items, setItems] = useState(recommendations);

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your recommendation history will appear here after your first chat session.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((rec) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          currentGoal={currentGoal}
          onDelete={() => handleDelete(rec.id)}
        />
      ))}
    </div>
  );
}
