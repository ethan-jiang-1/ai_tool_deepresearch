// ReferenceMetadata schema for reference/<topic>/source.yaml
// @impl RWG-001
// Each YAML file is an array of these objects.
import { z } from 'zod';

export const ReferenceMetadataSchema = z.object({
  url: z.string().min(1, 'url is required'),
  title: z.string().min(1, 'title is required'),
  retrieved_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'retrieved_date must be YYYY-MM-DD'),
  topic_tag: z.string().min(1, 'topic_tag is required'),
  notes: z.string().optional(),
});

/** Array of reference metadata entries — what reference/<topic>/source.yaml contains. */
export const ReferenceMetadataArraySchema = z.array(ReferenceMetadataSchema);
