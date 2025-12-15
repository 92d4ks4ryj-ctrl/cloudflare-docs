import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI } from "openapi-types";
import { blue, dim, green } from "kleur/colors";
import { readableMsDuration } from "../../sitemap.serializer";

const COMMIT = "8f1433a772228d435b2f32c06346e2b626d933bb";
let schema: OpenAPI.Document | undefined;

export const getSchema = async () => {
	if (typeof (globalThis as any).__getSchemaRunTime !== "number") {
		(globalThis as any).__getSchemaRunTime = 0;
	}
	if (!schema) {
		const startTime = performance.now();
		const response = await fetch(
			`https://gh-code.developers.cloudflare.com/cloudflare/api-schemas/${COMMIT}/openapi.json`,
		);
		const obj = await response.json();

		schema = await SwaggerParser.dereference(obj);
		const endTime = performance.now();
		const duration = endTime - startTime;
		(globalThis as any).__getSchemaRunTime += duration;
		console.log(
			"\n",
			dim(new Date().toLocaleTimeString("en-US", { hour12: false })),
			blue("[@cloudflare/getSchema]"),
			green(`✓ Retrieved schema in ${readableMsDuration(duration)}.`),
			green(
				`Total time spent fetching schema : ${readableMsDuration((globalThis as any).__getSchemaRunTime)}.`,
			),
		);
	}

	return schema;
};
