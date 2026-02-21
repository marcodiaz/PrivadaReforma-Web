import { describe, expect, it } from 'vitest'
import { filterMarketplacePosts, type MarketplaceFilters } from './logic'
import type { MarketplacePost } from '../../shared/domain/demoData'

const baseFilters: MarketplaceFilters = {
  query: '',
  condition: 'all',
  status: 'all',
  minPrice: '',
  maxPrice: '',
}

const samplePosts: MarketplacePost[] = [
  {
    id: 'm-1',
    title: 'Bicicleta',
    description: 'Rodada 26 en buen estado',
    price: 1800,
    photoUrl: 'data:image/png;base64,abc',
    condition: 'used',
    status: 'active',
    createdAt: '2026-02-21T10:00:00.000Z',
    updatedAt: '2026-02-21T10:00:00.000Z',
    createdByUserId: 'u-1',
    createdByName: 'Marco',
    contactMessage: 'Escribeme por WhatsApp',
    whatsappNumber: '5215512345678',
  },
  {
    id: 'm-2',
    title: 'Licuadora nueva',
    description: 'En caja',
    price: 700,
    photoUrl: 'data:image/png;base64,def',
    condition: 'new',
    status: 'sold',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    createdByUserId: 'u-2',
    createdByName: 'Ana',
    contactMessage: null,
    whatsappNumber: null,
  },
]

describe('filterMarketplacePosts', () => {
  it('filters by text query across title/description/seller fields', () => {
    const result = filterMarketplacePosts(samplePosts, { ...baseFilters, query: 'marco' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('m-1')
  })

  it('filters by condition and status', () => {
    const result = filterMarketplacePosts(samplePosts, {
      ...baseFilters,
      condition: 'new',
      status: 'sold',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('m-2')
  })

  it('filters by min/max price range', () => {
    const result = filterMarketplacePosts(samplePosts, {
      ...baseFilters,
      minPrice: '500',
      maxPrice: '1000',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('m-2')
  })
})
