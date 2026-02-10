import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loupe",
    short_name: "Loupe",
    description: "Ship fast. Catch drift. Monitor your pages for meaningful changes.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EC",
    theme_color: "#FF5A36",
    icons: [
      {
        src: "/logo-square.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo-square.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
