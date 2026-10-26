import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePlatform } from './usePlatform';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function resizeViewport(width: number, height = 800) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  resizeViewport(originalWidth, originalHeight);
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
});
