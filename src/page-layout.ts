export type PageLayoutBlock = {
  kind: "group" | "variant";
  reference: string;
  role: string;
  layout: string;
};

export type PageLayoutRegion = {
  id: string;
  blocks: PageLayoutBlock[];
};

export type PageLayoutFile = {
  regions: PageLayoutRegion[];
};

export function reorderPageBlock<T extends PageLayoutFile>(page: T, regionId: string, blockIndex: number, direction: -1 | 1): T {
  return {
    ...page,
    regions: page.regions.map((region) => {
      if (region.id !== regionId) return region;

      const nextIndex = blockIndex + direction;
      if (nextIndex < 0 || nextIndex >= region.blocks.length) return region;

      const blocks = region.blocks.map((block) => ({ ...block }));
      const [block] = blocks.splice(blockIndex, 1);
      blocks.splice(nextIndex, 0, block);
      return { ...region, blocks };
    }),
  };
}

export function movePageBlockToRegion<T extends PageLayoutFile>(page: T, sourceRegionId: string, blockIndex: number, targetRegionId: string): T {
  const sourceRegion = page.regions.find((region) => region.id === sourceRegionId);
  const block = sourceRegion?.blocks[blockIndex];
  if (!sourceRegion || !block || sourceRegionId === targetRegionId || !page.regions.some((region) => region.id === targetRegionId)) {
    return page;
  }

  return {
    ...page,
    regions: page.regions.map((region) => {
      if (region.id === sourceRegionId) {
        return { ...region, blocks: region.blocks.filter((_, index) => index !== blockIndex) };
      }
      if (region.id === targetRegionId) {
        return { ...region, blocks: [...region.blocks, { ...block }] };
      }
      return region;
    }),
  };
}
