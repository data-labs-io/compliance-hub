"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

export function Sidebar({ items, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-2 p-4", className)}>
      {items.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          asChild
          className={cn(
            "w-full justify-start gap-2",
            pathname === item.href && "bg-white/20 text-foreground"
          )}
        >
          <Link href={item.href}>
            {item.icon}
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export default Sidebar;