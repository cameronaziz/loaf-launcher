'use client';

import React, { FC } from 'react';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

export const MobileBottomNav: FC = () => {
  const { firstMenu, secondMenu } = useMenuItem();
  const { billingEnabled } = useVariables();
  const user = useUser();

  const allItems = [...firstMenu, ...secondMenu].filter((f) => {
    if (f.hide) return false;
    if (f.requireBilling && !billingEnabled) return false;
    if ((f as any).name === 'Billing' && user?.isLifetime) return false;
    if (f.role) return f.role.includes(user?.role!);
    return true;
  });

  // Show only the most important nav items on mobile (max 5)
  const primaryItems = allItems.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-newBgColorInner border-t border-newBorder flex items-center justify-around px-[4px] py-[4px] safe-area-pb">
      {primaryItems.map((item) => (
        <MenuItem
          key={item.name}
          path={item.path}
          label={item.name}
          icon={item.icon}
          onClick={item.onClick}
        />
      ))}
    </nav>
  );
};
