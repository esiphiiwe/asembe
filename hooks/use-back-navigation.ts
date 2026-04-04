import { useCallback } from 'react';
import { Href, router } from 'expo-router';

type BackNavigationOptions = {
  fallbackHref: Href;
  returnTo?: string | string[];
};

function normalizeHref(value?: string | string[]): Href | null {
  const href = Array.isArray(value) ? value[0] : value;

  if (!href) {
    return null;
  }

  return href as Href;
}

export function useBackNavigation({ fallbackHref, returnTo }: BackNavigationOptions) {
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const returnHref = normalizeHref(returnTo);

    if (returnHref) {
      router.replace(returnHref);
      return;
    }

    router.replace(fallbackHref);
  }, [fallbackHref, returnTo]);
}
