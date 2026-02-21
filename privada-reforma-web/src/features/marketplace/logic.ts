import type { MarketplacePost } from '../../shared/domain/demoData'

export type MarketplaceFilters = {
  query: string
  condition: 'all' | MarketplacePost['condition']
  status: 'all' | MarketplacePost['status']
  minPrice: string
  maxPrice: string
}

function parsePriceFilter(value: string) {
  if (!value.trim()) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function filterMarketplacePosts(posts: MarketplacePost[], filters: MarketplaceFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase()
  const minPrice = parsePriceFilter(filters.minPrice)
  const maxPrice = parsePriceFilter(filters.maxPrice)

  return posts.filter((post) => {
    if (filters.condition !== 'all' && post.condition !== filters.condition) {
      return false
    }
    if (filters.status !== 'all' && post.status !== filters.status) {
      return false
    }
    if (minPrice !== null && post.price < minPrice) {
      return false
    }
    if (maxPrice !== null && post.price > maxPrice) {
      return false
    }
    if (!normalizedQuery) {
      return true
    }

    const haystack = [
      post.title,
      post.description,
      post.createdByName,
      post.contactMessage ?? '',
      post.whatsappNumber ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}
