import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cookieParser());

const PORT = process.env.PORT || 8009;
const SITE_URL = process.env.SITE_URL || "https://staging.sociax.tech";

const DEFAULT_SEO = {
  title: "Sociax - Jobs for Fresh Graduates & Early Career Professionals",
  ogTitle: "Fresh Graduate, Recent Graduate & Entry-Level Jobs | Sociax",
  description:
    "Find fresh graduate, recent graduate, entry-level, OPT, STEM OPT and early-career jobs across the United States. Discover opportunities for candidates with 0-5 years of experience.",
};

const ROUTE_SEO = [
  {
    pattern: /^\/$/,
    title: "Sociax - Jobs for Fresh Graduates & Early Career Professionals",
    ogTitle: "Fresh Graduate, Recent Graduate & Entry-Level Jobs | Sociax",
    description: "Find fresh graduate, recent graduate, entry-level, OPT, STEM OPT and early-career jobs across the United States. Discover opportunities for candidates with 0-5 years of experience.",
  },
  {
    pattern: /^\/jobs(\/|$|\?)/,
    title: "Fresh Graduate Jobs & Entry-Level Careers",
    ogTitle: "0-5 Years Experience Jobs | Fresh Graduate Jobs | Sociax",
    description: "Explore jobs for fresh graduates, recent graduates and professionals with 0-5 years of experience. Search software engineering, data science, business analyst, finance and other entry-level opportunities.",
  },
  {
    pattern: /^\/opt(\/|$|\?)/,
    title: "OPT & STEM OPT Jobs in USA",
    ogTitle: "OPT Jobs, STEM OPT Jobs & Sponsorship Opportunities",
    description: "Find OPT, STEM OPT and visa-friendly job opportunities for international students and recent graduates across the United States.",
  },
  {
    pattern: /^\/about(\/|$)/,
    title: "About Sociax",
    ogTitle: "Sociax - Career Platform for Fresh Graduates",
    description: "Sociax helps fresh graduates, recent graduates and early-career professionals find jobs, grow their network and build successful careers.",
  },
];

function findRouteSEO(urlPath) {
  return (
    ROUTE_SEO.find((route) => route.pattern.test(urlPath)) || {}
  );
}

const DIST_FOLDER = path.resolve(__dirname, "./dist");
const INDEX_FILE = path.join(DIST_FOLDER, "index.html");

function sendPage(req, res) {

  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";

  const host = req.headers["x-forwarded-host"] || req.headers.host;

  const currentUrl = `${protocol}://${host}${req.originalUrl}`;

  const route = findRouteSEO(req.path);
  const title = route.title || DEFAULT_SEO.title;
  const ogTitle = route.ogTitle || DEFAULT_SEO.ogTitle;
  const description = route.description || DEFAULT_SEO.description;

  const ogImage = `${SITE_URL}/og-image.png`;
  const faviconPng = `${SITE_URL}/favicon.png`;
  const faviconIco = `${SITE_URL}/favicon.ico`;
  const appleTouchIcon = `${SITE_URL}/apple-touch-icon.png`;

  let html = fs.readFileSync(INDEX_FILE, "utf8");

  html = html
    .replace(/\$TITLE/g, title)
    .replace(/\$OG_TITLE/g, ogTitle)
    .replace(/\$OG_DESCRIPTION/g, description)
    .replace(/\$OG_IMAGE/g, ogImage)
    .replace(/\$FAVICON_PNG/g, faviconPng)
    .replace(/\$FAVICON_ICO/g, faviconIco)
    .replace(/\$APPLE_TOUCH_ICON/g, appleTouchIcon)
    .replace(/\$OG_URL/g, currentUrl);

  res.setHeader("Content-Type","text/html; charset=utf-8");

  res.setHeader("Cache-Control","no-cache, no-store, must-revalidate");

  res.send(html);
}

app.use(express.static(DIST_FOLDER, { index: false, }));

app.get("/", sendPage);
app.get("/jobs", sendPage);
app.get("/opt", sendPage);
app.get("/about", sendPage);

app.get(/.*/, (req, res) => {
  const ext = path.extname(req.path);

  if (ext && ext !== ".html") {
    return res.status(404).send("Not found");
  }

  sendPage(req, res);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
