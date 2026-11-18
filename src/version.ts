import metadata from "../package.json" with { type: "json" };

/** package.json is the application version authority; checkpoints may record
 * presentation-only revisions without advancing the functional milestone. */
export const APP_VERSION = metadata.version;
export const APP_MILESTONE = `M${APP_VERSION.replace(/^0\./, "")}`;
