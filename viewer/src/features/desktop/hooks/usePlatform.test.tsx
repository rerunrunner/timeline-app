import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePlatform } from './usePlatform';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
const originalMatchMedia = window.matchMedia;

function resizeViewport(width: number, height = 800) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function setCoarsePointer(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) =>
      ({
        matches: query === '(pointer: coarse)' && matches,
        media: query,
      }) as MediaQueryList,
  });
}

afterEach(() => {
  resizeViewport(originalWidth, originalHeight);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  });
});

describe('usePlatform', () => {
  it('routes 640px phones to mobile and wider viewports to desktop renderers', () => {
    resizeViewport(640);
    const { result } = renderHook(() => usePlatform());
    expect(result.current.platform).toBe('mobile');

    act(() => resizeViewport(641));
    expect(result.current.platform).toBe('tablet');

    act(() => resizeViewport(1025));
    expect(result.current.platform).toBe('computer');
  });

  it('keeps a coarse-pointer phone on mobile after landscape rotation', () => {
    setCoarsePointer(true);
    resizeViewport(390, 844);
    const { result } = renderHook(() => usePlatform());
    expect(result.current.platform).toBe('mobile');

    act(() => resizeViewport(844, 390));
    expect(result.current.platform).toBe('mobile');
    expect(result.current.orientation).toBe('landscape');
  });

  it('does not treat a short desktop window as a phone', () => {
    setCoarsePointer(false);
    resizeViewport(900, 500);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.platform).toBe('tablet');
  });
});
