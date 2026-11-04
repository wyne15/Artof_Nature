import { notFound } from "next/navigation";

/** Any unknown address under /en or /ro lands here and gets a real 404 status with the site's own 404 page. */
export default function CatchAll() {
  notFound();
}
