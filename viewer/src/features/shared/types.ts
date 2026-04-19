import type { RawData } from '../../utils/hydrate/types';

/**
 * A dataset discovered at runtime (editor API in dev or packaged JSON in prod).
 * Shared across any renderer that needs to list or resolve datasets.
 */
export type DatasetFile = {
  id: string;
  name: string;
  description: string;
  filename: string;
  data: RawData;
};
