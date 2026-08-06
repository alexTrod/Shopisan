/**
 * Normalizes a store into the shape ItemDetailModal expects.
 *
 * Every screen that opens the modal used to hand-build this object, so fields
 * drifted between call sites: the map dropped `images`/`imageUrl` (the detail
 * sheet fell back to the placeholder icon) and `owner_id` (owners lost the
 * "Add Post" button). Build it here instead.
 *
 * Accepts either a raw Firestore store doc (`name`, `category`, localized
 * `description`) or the flattened props an ItemCard already holds (`title`,
 * `tags`, plain string `description`).
 */
const localizedDescription = (description, locale) => {
  if (!description) return "";
  if (typeof description === "string") return description;
  return (
    description[locale] ||
    description.fr ||
    description.en ||
    Object.values(description).find((value) => typeof value === "string") ||
    ""
  );
};

const toDetailItem = (source, { getCategoryName, locale } = {}) => {
  if (!source) return null;

  // `tags` are already display names; `category` holds ids needing a lookup.
  const hasNamedTags = Array.isArray(source.tags) && source.tags.length > 0;
  const rawTags = hasNamedTags ? source.tags : (source.category ?? []);
  const tags =
    hasNamedTags || !getCategoryName ? rawTags : rawTags.map(getCategoryName);

  return {
    id: source.id ?? source._id,
    title: source.title ?? source.name ?? "",
    description: localizedDescription(source.description, locale),
    tags,
    address: Array.isArray(source.address) ? source.address : [],
    openingHours: source.openingHours ?? null,
    images: Array.isArray(source.images) ? source.images : [],
    imageUrl: source.imageUrl ?? null,
    owner_id: source.owner_id ?? null,
  };
};

export default toDetailItem;
