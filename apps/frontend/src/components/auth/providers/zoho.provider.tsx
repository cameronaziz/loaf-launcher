'use client';

import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const ZohoProvider = () => {
  const fetch = useFetch();
  const t = useT();
  const gotoLogin = useCallback(async () => {
    const link = await (await fetch('/auth/oauth/ZOHO')).text();
    window.location.href = link;
  }, []);
  return (
    <div
      onClick={gotoLogin}
      className={`cursor-pointer flex-1 bg-white h-[52px] rounded-[10px] flex justify-center items-center text-[#0E0E0E] gap-[10px]`}
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          width="21px"
          height="21px"
        >
          <path
            fill="#E42527"
            d="M8 12l16 12L8 36V12z"
          />
          <path
            fill="#E42527"
            d="M40 12H24l-8 12 8 12h16V12z"
          />
          <path
            fill="#FFFFFF"
            d="M24 12l-8 12 8 12 8-12z"
          />
        </svg>
      </div>
      <div className="block xs:hidden">{t('zoho', 'Zoho')}</div>
    </div>
  );
};
