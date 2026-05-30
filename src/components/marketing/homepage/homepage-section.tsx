import { cn } from "@/lib/utils";

type HomepageSectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function HomepageSection({
  children,
  className,
  id,
}: HomepageSectionProps) {
  return (
    <section id={id} className={cn("w-full py-12 md:py-20", className)}>
      {children}
    </section>
  );
}
