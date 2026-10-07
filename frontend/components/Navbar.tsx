"use client";

import { Bell, ChevronDown, CircleHelp, Search } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e9ebef] bg-white px-5 sm:px-8 lg:left-[240px]">
      
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#0b5cff] font-bold text-white">
          Z
        </div>

        <span className="font-semibold tracking-[-0.3px] text-[#232333]">
          Zoom
        </span>
      </div>

      {/* Search */}
      <div className="relative hidden w-[300px] md:block">
        <Search
          aria-hidden="true"
          size={17}
          strokeWidth={1.8}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747487]"
        />

        <input
          type="text"
          aria-label="Search meetings"
          placeholder="Search meetings..."
          className="h-10 w-full rounded-[10px] border border-[#e1e3e8] bg-[#f8f9fb] pl-9 pr-4 text-[13px] text-[#232333] outline-none transition placeholder:text-[#858597] focus:border-[#8bb5ff] focus:bg-white focus:ring-2 focus:ring-[#0b5cff]/10"
        />
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Help"
          className="hidden h-10 w-10 items-center justify-center rounded-[10px] text-[#626274] transition-colors hover:bg-[#f5f6f8] hover:text-[#232333] sm:flex"
        >
          <CircleHelp size={19} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-[#626274] transition-colors hover:bg-[#f5f6f8] hover:text-[#232333]"
        >
          <Bell size={19} strokeWidth={1.8} />
          <span className="absolute right-[9px] top-[9px] h-1.5 w-1.5 rounded-full bg-[#0b5cff]" />
        </button>

        <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#f5f6f8]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f1ff] text-xs font-bold text-[#0b5cff]">
            Y
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-semibold text-[#232333]">
              You
            </p>

            <p className="text-[11px] text-[#9ca3af]">
              Free
            </p>
          </div>

          <span className="hidden text-[#858597] sm:block">
            <ChevronDown size={15} strokeWidth={1.8} />
          </span>
        </button>
      </div>
    </header>
  );
}