import type { Loader, LoaderContext } from "astro/loaders";
import { DateTime, type DurationLike } from "luxon";
import {
	type GetContentRequest,
	GitHubService,
} from "~/content/api-schema/service";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";

const NAME = "api-schema";
const CACHE_KEYS = {
	LAST_SYNCED_TIMESTAMP: "lastSync",
} as const;
const NEVER = "never" as const;
const SCHEMA_FILE_REQUEST: GetContentRequest = {
	owner: "cloudflare",
	repo: "api-schemas",
	ref: "8f1433a772228d435b2f32c06346e2b626d933bb",
	path: "openapi.json",
	headers: { accept: "application/vnd.github.v3.raw" },
};

type Options = { force?: boolean; cacheDuration?: DurationLike };
export default function ({
	force = false,
	cacheDuration = { week: 1 },
}: Options): Loader {
	return {
		name: NAME,
		load: async ({
			logger,
			meta,
			store,
			parseData,
			generateDigest,
		}: LoaderContext) => {
			if (force) {
				store.clear();
				meta.delete(CACHE_KEYS.LAST_SYNCED_TIMESTAMP);
			}

			const lastSyncTimeString =
				meta.get(CACHE_KEYS.LAST_SYNCED_TIMESTAMP) ?? NEVER;
			logger.debug(`Last sync: ${lastSyncTimeString}`);
			const lastSyncedTime = DateTime.fromISO(lastSyncTimeString);

			if (lastSyncTimeString === NEVER) {
				logger.info("No previous sync found; will resync.");
			} else if (!lastSyncedTime.isValid) {
				logger.info("Invalid time for last sync; will resync.");
			}

			// Any syncs before this date are stale and should be resynced.
			const staleThreshold = DateTime.now().minus(cacheDuration);
			if (lastSyncedTime.isValid && lastSyncedTime > staleThreshold) {
				logger.info("Local cache is fresh. No sync needed.");
				return;
			}
			logger.info("Syncing API operations.");
			const schemaString = await new GitHubService().getFile(
				SCHEMA_FILE_REQUEST,
			);
			const parsedSchemaObject = JSON.parse(schemaString);
			const swagger = await SwaggerParser.dereference(parsedSchemaObject);
			const { paths } = swagger;
			if (paths === undefined) {
				logger.error("No routes found in schema.");
				return;
			}
			logger.info(`Syncing ${Object.keys(paths).length} routes.`);
			for (const [route, pathItem] of Object.entries(paths)) {
				if (!pathItem) continue;

				for (const maybeMethod of Object.keys(pathItem)) {
					if (isHttpMethod(maybeMethod)) {
						const id = `${maybeMethod.toUpperCase()}-${route}`;
						const operation = pathItem[maybeMethod];
						// TODO: add schema and use digest
						// const data = await parseData({ id, data: operation });
						// const digest = generateDigest(data);
						store.set({ id, data: operation });
					}
				}
			}
			meta.set(CACHE_KEYS.LAST_SYNCED_TIMESTAMP, DateTime.now().toISO());
		},
	};
}

function isHttpMethod(method: string): method is OpenAPIV3.HttpMethods {
	return (
		method.toLowerCase() === OpenAPIV3.HttpMethods.GET ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.PUT ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.PATCH ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.POST ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.DELETE ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.HEAD ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.OPTIONS ||
		method.toLowerCase() === OpenAPIV3.HttpMethods.TRACE
	);
}
