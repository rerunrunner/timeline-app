import { StrictMode, type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@posthog/react', () => ({
  usePostHog: () => posthog,
}));

describe('session analytics UI version', () => {
  beforeEach(() => {
    vi.resetModules();
    posthog.capture.mockReset();
    posthog.register.mockReset();
    window.__TIMELINE_CONFIG__ = {
      posthogToken: 'test-token',
      posthogHost: 'https://posthog.example',
      posthogEnableInDev: true,
    };
  });

  it('records the renderer selected by the App shell once per session', async () => {
    const { useSessionAnalytics } = await import('./useSessionAnalytics');
    const wrapper = ({ children }: PropsWithChildren) => (
      <StrictMode>{children}</StrictMode>
    );
    const { rerender } = renderHook(
      ({ uiVersion }: { uiVersion: 'mobile_v1' | 'desktop_v1' }) =>
        useSessionAnalytics({
          selectedDataFile: 'runner',
          timelinesReady: true,
          selectedLanguageCode: 'en',
          uiVersion,
        }),
      {
        initialProps: { uiVersion: 'mobile_v1' as const },
        wrapper,
      }
    );

    expect(posthog.register).toHaveBeenCalledWith({ ui_version: 'mobile_v1' });
    expect(
      posthog.capture.mock.calls.filter(([event]) => event === 'timeline_session_started')
    ).toEqual([
      [
        'timeline_session_started',
        expect.objectContaining({
          dataset_id: 'runner',
          selected_language: 'en',
          ui_version: 'mobile_v1',
        }),
      ],
    ]);

    rerender({ uiVersion: 'desktop_v1' });
    expect(posthog.register).toHaveBeenCalledWith({ ui_version: 'desktop_v1' });

    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(posthog.capture).toHaveBeenCalledWith(
      'timeline_session_ended',
      expect.objectContaining({
        dataset_id: 'runner',
        selected_language: 'en',
        ui_version: 'desktop_v1',
      })
    );
  });
});
