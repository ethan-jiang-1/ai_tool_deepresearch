// ReferenceMetadata schema for artifacts/wave0/<topic>/source.yaml (thin YAML)
// @impl RWG-001, RWG-011
// Each YAML file is an array of these objects.
import { z } from 'zod';

export const ReferenceMetadataSchema = z.object({
  url: z.string().min(1, 'url is required'),
  title: z.string().min(1, 'title is required'),
  retrieved_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'retrieved_date must be YYYY-MM-DD'),
  topic_tag: z.string().min(1, 'topic_tag is required'),
  notes: z.string().optional(),
});

/** Array of reference metadata entries — what artifacts/wave0/<topic>/source.yaml contains. */
export const ReferenceMetadataArraySchema = z.array(ReferenceMetadataSchema);

// _INDEX.md light validation — @impl SCO-010
const REQUIRED_COLUMNS = [
  'ref_file', 'source_type', 'trust_level', 'tier',
  'related_topic', 'source_layer', 'acceptance_status', 'date_landed',
];

/**
 * Validate _INDEX.md Markdown table structure.
 * @param {string} content — raw _INDEX.md file content
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateIndexMD(content) {
  const errors = [];
  const lines = content.split('\n');

  // Find header row (first row with | separators, before the separator line)
  let headerRow = null;
  let dataRowCount = 0;
  let pastSeparator = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    // Check if separator row (e.g., | --- | --- |)
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
      pastSeparator = true;
      continue;
    }

    if (!pastSeparator) {
      headerRow = trimmed;
    } else {
      dataRowCount++;
    }
  }

  if (!headerRow) {
    errors.push('_INDEX.md: no Markdown table header row found');
  } else {
    const columns = headerRow.split('|').map(c => c.trim()).filter(Boolean);
    for (const col of REQUIRED_COLUMNS) {
      if (!columns.includes(col)) {
        errors.push(`_INDEX.md: table header missing required column '${col}'`);
      }
    }
  }

  if (dataRowCount < 1) {
    errors.push('_INDEX.md: table has fewer than 1 data row');
  }

  return { valid: errors.length === 0, errors };
}
