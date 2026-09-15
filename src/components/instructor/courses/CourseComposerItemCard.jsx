"use client";

import React from "react";
import { MoreVertical, ChevronRight, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/shadcn/dropdown-menu";

export function CourseComposerItemCard({
  orderNumber,
  title,
  subtitle,
  metadataText,
  onClick,
  menuItems = [],
  badgeColorClass = "bg-primary/15 text-primary border-primary/30",
  hoverTextClass = "group-hover:text-primary",
  hoverBorderClass = "hover:border-primary/40",
  arrowColorClass = "group-hover:text-primary",
}) {
  const formattedNum = String(orderNumber).padStart(2, "0");

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border border-border/90 bg-background/60 hover:bg-background ${hoverBorderClass} transition duration-150 shadow-sm cursor-pointer min-h-[125px]`}
    >
      {/* Top Bar: Order Badge & 3-Dot Kebab Menu */}
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2.5 py-0.5 rounded text-sm font-mono font-bold border ${badgeColorClass}`}>
          {formattedNum}
        </span>

        {/* 3-Dot Menu */}
        {menuItems.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  aria-label="Item actions"
                >
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                {menuItems.map((item, idx) =>
                  item.separator ? (
                    <DropdownMenuSeparator key={`sep-${idx}`} className="bg-muted" />
                  ) : (
                    <DropdownMenuItem
                      key={item.label || idx}
                      disabled={item.disabled}
                      onClick={item.onSelect}
                      className={`cursor-pointer text-sm ${
                        item.destructive
                          ? "text-red-400 hover:bg-red-950/40"
                          : item.highlight
                          ? "text-purple-400 hover:bg-background font-semibold"
                          : "hover:bg-background"
                      }`}
                    >
                      {item.icon && <item.icon className="mr-2 size-3.5" />}
                      {item.label}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Middle: Title & Subtitle */}
      <div className="my-2 space-y-1">
        <h4 className={`text-h4 text-foreground line-clamp-2 ${hoverTextClass} transition`}>
          {title}
        </h4>
        {subtitle && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom Bar: Metadata & Arrow Affordance */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-border/60 text-muted-foreground">
        <span className="text-[13px] font-mono font-medium">
          {metadataText}
        </span>
        <ArrowRight size={13} className={`text-muted-foreground ${arrowColorClass} group-hover:translate-x-0.5 transition`} />
      </div>
    </div>
  );
}
