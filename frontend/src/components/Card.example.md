# Card Component Usage

This document shows how to use the Card component and related utilities for blackjack and poker games.

## Basic Usage

```tsx
import { Card } from "@/components";
import { CardSuit, CardRank } from "@/enums";

// Display a face-up card
<Card 
    card={{ suit: CardSuit.HEARTS, rank: CardRank.ACE }} 
    width={120} 
    height={168} 
/>

// Display a face-down card (card back)
<Card faceDown width={120} height={168} />

// Card with custom size and className
<Card 
    card={{ suit: CardSuit.SPADES, rank: CardRank.KING }} 
    width={100} 
    height={140}
    className="my-card-class"
/>
```

## Using with Deck Utilities

```tsx
import { createShuffledDeck, dealCard } from "@/utils/deck";
import { Card } from "@/components";

// Create a shuffled deck
const deck = createShuffledDeck();

// Deal a card
const { card, remainingDeck } = dealCard(deck);

// Render the dealt card
<Card card={card} width={100} height={140} />
```

## Example: Displaying a Hand

```tsx
import { Card } from "@/components";
import type { Card as CardModel } from "@/models";

interface HandProps {
    cards: CardModel[];
}

function Hand({ cards }: HandProps) {
    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            {cards.map((card, index) => (
                <Card 
                    key={`${card.suit}-${card.rank}-${index}`}
                    card={card} 
                    width={100} 
                    height={140} 
                />
            ))}
        </div>
    );
}
```

## Example: Blackjack Hand with Face-Down Dealer Card

```tsx
import { Card } from "@/components";
import type { Card as CardModel } from "@/models";

interface BlackjackHandProps {
    cards: CardModel[];
    hideFirstCard?: boolean; // For dealer's hidden card
}

function BlackjackHand({ cards, hideFirstCard }: BlackjackHandProps) {
    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            {cards.map((card, index) => (
                <Card 
                    key={`${card.suit}-${card.rank}-${index}`}
                    card={index === 0 && hideFirstCard ? undefined : card}
                    faceDown={index === 0 && hideFirstCard}
                    width={100} 
                    height={140} 
                />
            ))}
        </div>
    );
}
```

## Card Model

```tsx
import type { Card } from "@/models";
import { CardSuit, CardRank } from "@/enums";

const myCard: Card = {
    suit: CardSuit.DIAMONDS,
    rank: CardRank.QUEEN
};
```

## Available Card Utilities

- `getCardValue(rank)`: Get numeric value for blackjack scoring
- `isFaceCard(rank)`: Check if card is Jack, Queen, or King
- `isAce(rank)`: Check if card is an Ace
- `createDeck()`: Create a standard 52-card deck
- `shuffleDeck(deck)`: Shuffle a deck
- `createShuffledDeck()`: Create and shuffle a deck
- `dealCard(deck)`: Deal one card from deck
- `dealCards(deck, count)`: Deal multiple cards from deck

