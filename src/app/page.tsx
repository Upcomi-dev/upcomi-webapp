import { HomeMapContent, type HomeSearchParams } from "./home-map-content";

export const revalidate = 300;

interface HomePageProps {
  searchParams: Promise<HomeSearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return <HomeMapContent params={params} />;
}
