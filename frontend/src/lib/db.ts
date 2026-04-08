/**
 * InstantDB client initialization.
 *
 * Falls back gracefully when no real App ID is configured,
 * so the rest of the app still renders (minus realtime features).
 */
import { init, id as instantId } from "@instantdb/react";

// A valid-format UUID placeholder so InstantDB SDK doesn't crash on init.
// Replace with your real App ID from https://instantdb.com/dash
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || PLACEHOLDER_ID;

// Validate UUID format
const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(APP_ID);

export const db = init({ appId: isValidUUID ? APP_ID : PLACEHOLDER_ID });

export const isInstantDBConfigured = isValidUUID && APP_ID !== PLACEHOLDER_ID;

export { instantId as id };
