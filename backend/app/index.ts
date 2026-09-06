import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../database/client";

import { albums } from "../routes/albums";
import { media } from "../routes/media";
import { bookings } from "../routes/bookings";
import { contact } from "../routes/contact";
import { testimonials } from "../routes/testimonials";
import { settings } from "../routes/settings";
import { blog } from "../routes/blog";
import { seo } from "../routes/seo";
import { galleryAccess } from "../routes/gallery-access";
import { analytics } from "../routes/analytics";
import { adminAuth } from "../routes/admin-auth";
import { services } from "../routes/services";
import { packages } from "../routes/packages";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["https://bynaveedanjum.com", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.json({ status: "ok", service: "naveed-portfolio-cms-api" }));

app.route("/albums", albums);
app.route("/media", media);
app.route("/bookings", bookings);
app.route("/contact", contact);
app.route("/testimonials", testimonials);
app.route("/settings", settings);
app.route("/blog", blog);
app.route("/seo", seo);
app.route("/gallery-access", galleryAccess);
app.route("/analytics", analytics);
app.route("/admin-auth", adminAuth);
app.route("/services", services);
app.route("/packages", packages);

app.onError((err, c) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal error";
  return c.json({ error: message }, 500);
});

export default app;
