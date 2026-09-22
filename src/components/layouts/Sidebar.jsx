"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars } from '@/components/ui/reactIcons';
import { PiOrangeDuotone } from '@/components/ui/reactIcons';
import { X, ChevronRight, ChevronDown } from 'lucide-react';

import { SIDEBAR_ITEMS } from '@/constants/sidebar';

export default function Sidebar({
  role,
  open,
  setOpen,
  collapsed,
  setCollapsed,
}) {
  const pathname = usePathname();
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState(null);
  const [desktopExpandedMenu, setDesktopExpandedMenu] = useState(null);

  const menus = SIDEBAR_ITEMS[role] || [];
  const isCollapsed = collapsed;

  // Close mobile drawer on escape press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setOpen]);

  // Define sub-fields dynamic configuration
  const getSubmenus = (title) => {
    if (role === "INSTRUCTOR") {
      if (title === "Courses") {
        return [
          { title: "My Courses List", href: "/instructor/courses" },
          { title: "Create New Course", href: "/instructor/courses/create" },
        ];
      }
      if (title === "Quizzes") {
        return [
          { title: "My Quizzes List", href: "/instructor/quizzes" },
          { title: "Create New Quiz", href: "/instructor/quizzes/create" },
        ];
      }
    }
    if (role === "STUDENT") {
      if (title === "Courses") {
        return [
          { title: "All Available Courses", href: "/student/courses" },
          { title: "My Enrolled Courses", href: "/student/my-courses" },
        ];
      }
    }
    if (role === "ADMIN") {
      if (title === "Courses") {
        return [
          { title: "Manage Course Catalog", href: "/admin/courses" },
          { title: "View Course Enrollments", href: "/admin/enrollments" },
        ];
      }
    }
    return null;
  };

  // Auto-expand menus based on current pathname
  useEffect(() => {
    menus.forEach((item) => {
      const subItems = getSubmenus(item.title);
      if (subItems && subItems.some((sub) => pathname === sub.href)) {
        setDesktopExpandedMenu(item.title);
        setMobileExpandedMenu(item.title);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, role]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Mobile Drawer (Visible on mobile, hidden on md+) */}
      <div
        className={`fixed top-0 left-0 h-screen w-72 bg-background border-r border-border/60 z-[60] md:hidden transition-transform duration-300 ease-in-out flex flex-col justify-between shadow-2xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header branding & Close button */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <PiOrangeDuotone className="text-xl text-primary" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">
                Orange Tree <span className="text-primary">LMS</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-none">
            {menus.map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/student/dashboard' && item.href !== '/instructor/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              const subItems = getSubmenus(item.title);
              const hasSubmenus = subItems && subItems.length > 0;
              const isExpanded = mobileExpandedMenu === item.title;
              const isSeparator = idx > 0 && (item.title === "Settings" || item.title === "Profile");

              return (
                <div key={item.href} className="space-y-1">
                  {isSeparator && <div className="my-1.5 border-t border-border/40" />}
                  {hasSubmenus ? (
                    <button
                      onClick={() => setMobileExpandedMenu(isExpanded ? null : item.title)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                        isActive || isExpanded
                          ? 'bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          {typeof Icon === "string" ? (
                            <span className="text-base select-none">{Icon}</span>
                          ) : (
                            <Icon className={`text-base ${isActive || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                          )}
                        </div>
                        <span className="text-nav">{item.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={14} className={isActive || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground'} />
                      ) : (
                        <ChevronRight size={14} className={isActive || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground'} />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {typeof Icon === "string" ? (
                          <span className="text-base select-none">{Icon}</span>
                        ) : (
                          <Icon className={`text-base ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      <span className="text-nav">{item.title}</span>
                    </Link>
                  )}

                  {/* Accordion for Mobile Submenu items */}
                  {hasSubmenus && isExpanded && (
                    <div className="pl-9 pr-2 py-1 space-y-1">
                      {subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              setOpen(false);
                              setMobileExpandedMenu(null);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 text-nav rounded-lg transition-all duration-200 ${
                              isSubActive
                                ? 'bg-primary/15 text-primary font-bold border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                            <span>{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col
          sticky top-0 left-0
          h-screen
          ${role === 'INSTRUCTOR' ? 'bg-background border-r border-border/60' : 'bg-background border-r border-border/60'}
          z-50
          transition-[width] duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          ${collapsed ? 'w-16' : 'w-60'}
          shadow-xl
        `}
      >
        {/* Top Header Row with Logo & Collapse Toggle */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-border/60 shrink-0">
          {!isCollapsed ? (
            <Link href={role === 'INSTRUCTOR' ? '/instructor/courses' : role === 'ADMIN' ? '/admin/dashboard' : '/student/my-courses'} className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                <PiOrangeDuotone className="text-xl text-primary" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight truncate">
                Orange Tree <span className="text-primary">LMS</span>
              </span>
            </Link>
          ) : (
            <div className="mx-auto p-1.5 rounded-lg bg-primary/10 border border-primary/20" title="Orange Tree LMS">
              <PiOrangeDuotone className="text-xl text-primary" />
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              title="Collapse Sidebar"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer shrink-0"
            >
              <FaBars className="text-xs" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button when sidebar is collapsed */}
        {isCollapsed && (
          <div className="pt-2 pb-1 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              title="Expand Sidebar"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/40 transition cursor-pointer"
            >
              <FaBars className="text-xs" />
            </button>
          </div>
        )}

        {/* Desktop Navigation Link List */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 relative scrollbar-none">
          {menus.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/student/dashboard' && item.href !== '/instructor/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            const subItems = getSubmenus(item.title);
            const hasSubmenus = subItems && subItems.length > 0;
            const isExpanded = desktopExpandedMenu === item.title;
            const isSeparator = idx > 0 && (item.title === "Settings" || item.title === "Profile");

            return (
              <div
                key={item.href}
                className="relative group space-y-1"
                onMouseEnter={() => collapsed && setHoveredMenu(item.title)}
                onMouseLeave={() => collapsed && setHoveredMenu(null)}
              >
                {isSeparator && <div className="my-1.5 border-t border-border/40" />}

                {hasSubmenus && !collapsed ? (
                  <button
                    onClick={() => setDesktopExpandedMenu(isExpanded ? null : item.title)}
                    className={`
                      w-full flex items-center justify-between
                      px-3 py-2
                      rounded-xl
                      transition-all duration-200
                      cursor-pointer
                      ${
                        isActive || isExpanded
                          ? 'bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {typeof Icon === "string" ? (
                          <span className="text-base select-none">{Icon}</span>
                        ) : (
                          <Icon className={`text-base transition-colors duration-200 ${isActive || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                        )}
                      </div>
                      <span className="text-nav truncate">
                        {item.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={14} className={isActive || isExpanded ? 'text-primary-foreground shrink-0 ml-1' : 'text-muted-foreground shrink-0 ml-1 group-hover:text-primary'} />
                    ) : (
                      <ChevronRight size={14} className={isActive || isExpanded ? 'text-primary-foreground shrink-0 ml-1' : 'text-muted-foreground shrink-0 ml-1 group-hover:text-primary'} />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (hasSubmenus && collapsed) {
                        setCollapsed(false);
                        setDesktopExpandedMenu(item.title);
                      }
                    }}
                    className={`
                      flex items-center
                      ${collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'}
                      rounded-xl
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary text-slate-950 font-bold shadow-[0_2px_12px_rgba(249,115,22,0.35)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                      }
                    `}
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {typeof Icon === "string" ? (
                        <span className="text-base select-none">{Icon}</span>
                      ) : (
                        <Icon className={`text-base transition-colors duration-200 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                      )}
                    </div>
                    {!collapsed && (
                      <span className="text-nav truncate">
                        {item.title}
                      </span>
                    )}
                  </Link>
                )}

                {/* Submenu inline accordion for desktop expanded mode */}
                {hasSubmenus && !collapsed && isExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    {subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`
                            flex items-center gap-2 px-2.5 py-1.5 text-nav rounded-lg transition-all duration-200
                            ${
                              isSubActive
                                ? 'bg-primary/15 text-primary font-bold border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            }
                          `}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                          <span className="truncate">{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Custom styled hover tooltip when sidebar is collapsed */}
                {!hasSubmenus && collapsed && hoveredMenu === item.title && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100] px-3 py-2 rounded-[8px] border border-border/60 bg-popover text-foreground text-xs font-semibold whitespace-nowrap shadow-xl shadow-black/40 animate-in fade-in slide-in-from-left-2 duration-150 pointer-events-none flex items-center">
                    {/* Arrow pointing toward the sidebar icon */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-popover border-l border-b border-border/60 rotate-45" />
                    <span className="relative z-10">{item.title}</span>
                  </div>
                )}

                {/* Submenu selection flyout container when collapsed */}
                {hasSubmenus && collapsed && hoveredMenu === item.title && (
                  <div className="absolute left-full top-0 ml-3 z-[100] w-48 rounded-[8px] border border-border/60 bg-popover backdrop-blur-xl p-2 shadow-xl shadow-black/40 animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="absolute -left-1 top-4 w-2 h-2 bg-popover border-l border-b border-border/60 rotate-45" />
                    <div className="relative z-10 text-[10px] text-primary font-bold px-2 py-1 uppercase tracking-wider border-b border-border/60 mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item.title}</span>
                    </div>
                    <div className="relative z-10 space-y-1">
                      {subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              setHoveredMenu(null);
                            }}
                            className={`
                              flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-all duration-200
                              ${
                                isSubActive
                                  ? 'bg-primary/15 text-primary font-bold border border-primary/20'
                                  : 'text-foreground hover:text-foreground hover:bg-muted/60'
                              }
                            `}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                            <span>{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}