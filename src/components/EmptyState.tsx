import React from "react";

interface EmptyStateProps {
  title?: string;
  note?: string;
  cta?: React.ReactNode;
}

export default function EmptyState({ 
  title = "Nothing here (yet)", 
  note = "Create or connect to get started", 
  cta 
}: EmptyStateProps) {
  return (
    <div className="card p-8 text-center">
      <div className="h2 mb-2">{title}</div>
      <p className="small">{note}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
