import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * A module's `server/` folder never reaches the browser. The guard keys on the
 * *importing* file's location rather than on the path imported (ADR-0020): a
 * file inside a `server/` folder may reach another module's `server/` in the
 * direction ADR-0009 permits, and everything else — `app/`, `components/`, and
 * a module's own `admin/` and `shop/` folders, which are not `server/` — may
 * not. Left to `import "server-only"` alone this fails at build time naming a
 * leaf file; here it fails at lint time naming the import that dragged it in.
 */
const serverImportPatterns = [
  "@/**/server",
  "@/**/server/**",
  "./server",
  "./server/**",
  "./**/server",
  "./**/server/**",
  "../**/server",
  "../**/server/**",
];

const serverImportMessage =
  "A file outside a server/ folder may not import from one (ADR-0020). " +
  "Reach the module through its root files or a tRPC procedure instead; " +
  "a module's admin/ and shop/ folders are not server/.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    name: "hertz-lab/server-boundary",
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: serverImportPatterns,
              message: serverImportMessage,
            },
          ],
        },
      ],
    },
  },
  {
    // The importers ADR-0020 permits: any file inside a server/ folder, and
    // the router composition that assembles the server halves into one API.
    name: "hertz-lab/server-boundary-permitted-importers",
    files: ["**/server/**", "trpc/routers/_app.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
