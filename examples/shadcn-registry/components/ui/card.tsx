import * as React from "react";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card" {...props} />;
}
