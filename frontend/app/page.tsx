import { getRealProjects, type CmsProject } from "@/lib/cmsData";
import HomeClient from "./HomeClient";

function toProject(p: CmsProject) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    categories: p.categories || [],
    description: p.description || "",
    fullDescription: p.fullDescription || "",
    clientName: p.clientName || "",
    location: p.location || "",
    projectDate: p.projectDate || "",
    tags: [] as string[],
    featured: p.featured || false,
    coverImage: p.coverImage || "",
    images: (p.images || []).map((img) => ({ url: img.url, orientation: img.orientation || "landscape" })),
    videos: [] as string[],
    reels: p.reels || [],
    youtubeUrl: p.youtubeUrl || "",
    projectName: p.projectName,
    bannerTitle: p.bannerTitle,
    bannerImage: p.bannerImage,
    previousSlugs: p.previousSlugs,
  };
}

export default async function Home() {
  let initialProjects;
  try {
    const real = await getRealProjects();
    initialProjects = real.map(toProject);
  } catch {
    initialProjects = undefined;
  }
  return <HomeClient initialProjects={initialProjects} />;
}
