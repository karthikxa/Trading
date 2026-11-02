'use client';

import { CaretDownIcon, GearSixIcon, SignOutIcon } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@kortix/ui/button';
import { BackPillBody, backPillClass } from '@kortix/ui/back-pill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kortix/ui/dropdown-menu';
import Loading from '@kortix/ui/loading';
import { useTranslations } from '@/i18n/use-translations';

const NotificationBell = dynamic(
  () => import('@kortix/ui/internal/notifications/notification-bell').then((mod) => mod.NotificationBell),
  { ssr: false },
);

export function AccountTopBar({
  email,
  name,
  signingOut,
  onLogOut,
  back,
  trailing,
}: {
  email: string | null;
  name?: string | null;
  signingOut: boolean;
  onLogOut: () => void;
  back?: { href: string; label: string };
  trailing?: ReactNode;
}) {
  const t = useTranslations('newWorkspace');
  const identity = name?.trim() || email;

  return (
    <div className="kx-desktop-band-row absolute inset-x-0 top-3 z-10 flex items-center justify-between gap-3 px-4 sm:top-4 sm:px-6">
      {back ? (
        <Button
          asChild
          variant="ghost"
          size="xs"
          className={backPillClass('kx-web-only-back')}
        >
          <Link href={back.href}>
            <BackPillBody label={back.label} />
          </Link>
        </Button>
      ) : (
        <span aria-hidden />
      )}

      <div className="flex min-w-0 items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={signingOut}
              aria-label={identity ? `${t('account.loggedInAs')} ${identity}` : t('account.label')}
              className="hover:bg-hover data-[state=open]:bg-hover focus-visible:ring-ring flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-(--duration-normal) ease-out focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-muted-foreground text-xs">{t('account.loggedInAs')}</span>
                <span className="text-foreground max-w-56 truncate text-sm">
                  {identity ?? t('account.label')}
                </span>
              </span>
              {signingOut ? (
                <Loading className="size-4 shrink-0" />
              ) : (
                <CaretDownIcon className="text-muted-foreground size-3.5 shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" prefetch>
                <GearSixIcon />
                {t('actions.settings')}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signingOut} onSelect={onLogOut}>
              <SignOutIcon />
              {signingOut ? t('actions.signingOut') : t('actions.logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {trailing}
      </div>
    </div>
  );
}
