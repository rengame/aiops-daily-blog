import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";
import { getAssetPath } from "@/utils/withBase";

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: new URL(
      `${getAssetPath("/")}/`.replace(/\/+$/, "/"),
      config.site.url
    ),
    customData: "<language>zh-CN</language>",
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPostUrl(id, filePath, config.site.lang),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.pubDatetime),
    })),
  });
}
