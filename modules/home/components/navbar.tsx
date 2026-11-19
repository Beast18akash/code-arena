"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Code2,
  Info,
  User,
  PlusCircle,
  LogIn,
  UserPlus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { UserRole } from "@/lib/generated/prisma/client";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/problems", label: "Problems", icon: Code2 },
  { href: "/about", label: "About", icon: Info },
];

export const Navbar = ({ userRole }: { userRole?: UserRole | string | null }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 transition-all duration-200 hover:bg-white/15 dark:hover:bg-black/30">
        <div className="px-5 py-3.5 flex items-center justify-between">

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative">
              <Image
                src="/logo.svg"
                alt="Outcode"
                width={36}
                height={36}
                className="transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <span className="font-bold text-xl tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">
              Outcode
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/10 dark:bg-white/5 border border-white/10 dark:border-white/5 rounded-full px-3 py-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-amber-400/15 text-amber-400 font-semibold shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isLoaded && isSignedIn && (
              <Link
                href="/profile"
                className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  pathname === "/profile"
                    ? "bg-amber-400/15 text-amber-400 font-semibold shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-white/5"
                }`}
              >
                Profile
              </Link>
            )}
          </div>

          {/* Desktop Right Actions (Theme + Auth) */}
          <div className="hidden md:flex items-center gap-3">
            <ModeToggle />

            {!isLoaded ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-18 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-18 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ) : isSignedIn ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="/create-problem">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/10 text-amber-400 text-xs font-semibold gap-1.5 h-8 rounded-full"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Create Problem
                    </Button>
                  </Link>
                )}
                <div className="pl-1 border-l border-white/10">
                  <UserButton />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-full h-8 px-3.5"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button
                    size="sm"
                    className="text-xs font-semibold bg-amber-400 hover:bg-amber-500 text-zinc-950 rounded-full h-8 px-4 shadow-sm shadow-amber-400/20"
                  >
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Mode Toggle + Clean Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <ModeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-xl p-2 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[300px] sm:w-[340px] p-0 flex flex-col justify-between bg-zinc-950/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800/80 shadow-2xl"
              >
                {/* Drawer Top Section */}
                <div className="p-6 flex flex-col gap-5">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 pr-8">
                    <Link
                      href="/"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2"
                    >
                      <Image src="/logo.svg" alt="Outcode" width={30} height={30} />
                      <span className="font-bold text-lg tracking-wider text-amber-400">
                        Outcode
                      </span>
                      <span className="ml-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        Beta
                      </span>
                    </Link>
                  </div>

                  {/* Navigation Links Group */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3 pb-1">
                      Menu
                    </span>

                    {NAV_LINKS.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-amber-400/10 text-amber-400 border border-amber-400/25 shadow-sm font-semibold"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`w-4 h-4 transition-colors ${
                                isActive
                                  ? "text-amber-400"
                                  : "text-zinc-500 group-hover:text-amber-400"
                              }`}
                            />
                            <span>{link.label}</span>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                              isActive ? "text-amber-400/70" : "text-zinc-600"
                            }`}
                          />
                        </Link>
                      );
                    })}

                    {isLoaded && isSignedIn && (
                      <Link
                        href="/profile"
                        onClick={() => setOpen(false)}
                        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                          pathname === "/profile"
                            ? "bg-amber-400/10 text-amber-400 border border-amber-400/25 shadow-sm font-semibold"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <User
                            className={`w-4 h-4 transition-colors ${
                              pathname === "/profile"
                                ? "text-amber-400"
                                : "text-zinc-500 group-hover:text-amber-400"
                            }`}
                          />
                          <span>Profile</span>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                            pathname === "/profile" ? "text-amber-400/70" : "text-zinc-600"
                          }`}
                        />
                      </Link>
                    )}
                  </div>

                  {/* Admin Shortcut if applicable */}
                  {isLoaded && isSignedIn && isAdmin && (
                    <div className="pt-2">
                      <Link
                        href="/create-problem"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 text-amber-400 text-xs font-semibold transition-all shadow-sm"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Problem
                      </Link>
                    </div>
                  )}
                </div>

                {/* Drawer Bottom / Auth Section */}
                <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-3">
                  {!isLoaded ? (
                    <div className="flex flex-col gap-2">
                      <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900" />
                      <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900" />
                    </div>
                  ) : isSignedIn ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                      <div className="flex items-center gap-3">
                        <UserButton />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-zinc-200">
                            My Account
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Manage profile & settings
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <SignInButton>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-11 rounded-xl border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800/80 text-zinc-200 font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <LogIn className="w-4 h-4 text-zinc-400" />
                          <span>Sign In</span>
                        </Button>
                      </SignInButton>
                      <SignUpButton>
                        <Button
                          size="sm"
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-semibold flex items-center justify-center gap-2 shadow-md shadow-amber-400/15 transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Sign Up</span>
                        </Button>
                      </SignUpButton>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Outcode Platform
                    </span>
                    <span>© 2026</span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
};
