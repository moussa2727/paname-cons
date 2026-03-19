import type { ReactNode } from "react";

const MinimalLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y">
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default MinimalLayout;
