"use client";

import { useState } from "react";
import { CalendarDays, House, UsersRound, type LucideIcon } from "lucide-react";

export default function Sidebar() {
  const [active, setActive] = useState("Home");

  const menuItems: { name: string; icon: LucideIcon }[] = [
    {
      name: "Home",
      icon: House,
    },
    {
      name: "Meetings",
      icon: CalendarDays,
    },
    {
      name: "Contacts",
      icon: UsersRound,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] border-r border-[#e9ebef] bg-white lg:flex lg:flex-col">
      
      {/* Logo */}
      <div className="flex h-[76px] items-center px-7">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#0b5cff] text-lg font-bold text-white shadow-[0_2px_5px_rgba(11,92,255,0.2)]">
            Z
          </div>

          <span className="text-[21px] font-semibold tracking-[-0.65px] text-[#232333]">
            Zoom
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-5 flex-1 px-4">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#747487]">
          Workspace
        </p>

        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = active === item.name;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => setActive(item.name)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#edf4ff] text-[#0b5cff]"
                    : "text-[#56566a] hover:bg-[#f5f6f8] hover:text-[#232333]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-white text-[#0b5cff] shadow-[0_1px_3px_rgba(16,24,40,0.1)]"
                      : "text-[#747487]"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                </span>

                {item.name}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#eef0f3] p-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f7f8fa]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f1ff] text-sm font-semibold text-[#0b5cff]">
            Y
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#232333]">
              You
            </p>

            <p className="truncate text-xs text-[#9ca3af]">
              Free account
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}