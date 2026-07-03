import { cpSync, createReadStream, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { defineConfig } from "vite";

const BATTler_SRC_DIR = join(process.cwd(), "assets/battlers");
const BATTler_PUBLIC_DIR = join(process.cwd(), "public/assets/battlers");

function syncBattlerPngsToPublic() {
  if (!existsSync(BATTler_SRC_DIR)) {
    return;
  }

  mkdirSync(BATTler_PUBLIC_DIR, { recursive: true });

  for (const file of readdirSync(BATTler_SRC_DIR)) {
    if (!file.endsWith(".png")) {
      continue;
    }

    cpSync(join(BATTler_SRC_DIR, file), join(BATTler_PUBLIC_DIR, file));
  }
}

function battlerAssetsPlugin() {
  return {
    name: "battler-assets",
    buildStart() {
      syncBattlerPngsToPublic();
    },
    configureServer(server) {
      syncBattlerPngsToPublic();
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/assets/battlers/")) {
          return next();
        }

        const fileName = req.url.split("/").pop()?.split("?")[0];
        if (!fileName?.endsWith(".png")) {
          return next();
        }

        const filePath = join(BATTler_SRC_DIR, fileName);
        if (!existsSync(filePath)) {
          return next();
        }

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(filePath).pipe(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/assets/battlers/")) {
          return next();
        }

        const fileName = req.url.split("/").pop()?.split("?")[0];
        if (!fileName?.endsWith(".png")) {
          return next();
        }

        const publicPath = join(BATTler_PUBLIC_DIR, fileName);
        const sourcePath = join(BATTler_SRC_DIR, fileName);
        const filePath = existsSync(publicPath) ? publicPath : sourcePath;

        if (!existsSync(filePath)) {
          return next();
        }

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600");
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [battlerAssetsPlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
