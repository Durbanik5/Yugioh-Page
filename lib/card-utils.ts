// Card image URL utilities

export function getCardImageUrl(cardId: number | null, cardName: string): string {
  if (cardId) {
    return `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`
  }
  return '/images/card-back.jpg'
}

export function getCardSmallImageUrl(cardId: number | null): string {
  if (cardId) {
    return `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`
  }
  return '/images/card-back.jpg'
}

export function getCardBackUrl(): string {
  return '/images/card-back.jpg'
}
