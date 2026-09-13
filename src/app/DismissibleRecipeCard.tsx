"use client";

import type { ReactNode } from "react";

export function DismissibleRecipeCard({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className="card added-recipe-card">
      <div className="finder-head">
        <h2 className="section-title">{title}</h2>
        <button className="btn btn-quiet" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </section>
  );
}
