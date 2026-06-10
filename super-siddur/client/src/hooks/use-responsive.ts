import { useWindowDimensions } from 'react-native';

import { BP } from '@/constants/theme';

/** Layout helpers derived from the current viewport width. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isPhone: width < BP.tablet,
    isTablet: width >= BP.tablet && width < BP.desktop,
    isDesktop: width >= BP.desktop,
    isWide: width >= BP.wide,
    /** Horizontal page padding scales up on larger screens. */
    gutter: width < BP.tablet ? 18 : width < BP.desktop ? 32 : 56,
  };
}
