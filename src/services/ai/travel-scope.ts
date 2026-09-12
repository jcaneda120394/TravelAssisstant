/**
 * TravelAssistant AI only answers travel / trip planning questions.
 * Off-topic prompts are rejected before tools or the model run.
 */

/** Strong travel / app-scope signals. */
const STRONG_TRAVEL =
  /\b(travel|trip|trips|tour|vacation|holiday|itinerary|destination|destinations|attraction|attractions|sightseeing|museum|park|temple|landmark|hotel|hotels|hostel|stay|accommodation|restaurant|restaurants|food|eat|dining|cafe|coffee|bakery|lunch|dinner|breakfast|cuisine|bar|pub|convenience|convenience store|7-eleven|familymart|lawson|minimart|supermarket|grocery|souvenir|gift shop|route|routes|direction|directions|map|transit|train|subway|metro|bus|flight|flights|airport|taxi|rideshare|walk|walking|weather|forecast|rain|budget|expense|currency|exchange|esim|sim|wifi|cowork|hospital|pharmacy|police|embassy|emergency|visa|passport|packing|luggage|beach|island|mountain|hike|tour|nightlife|market|mall|shop|shopping|ticket|tickets|reservation|booking|check[- ]?in|check[- ]?out|things to do|where can|how do i get|best food|near me|local tip|local tips|nearby|places?|city|cities|country|countries)\b/i;

/** Weaker cues that only count with another travel signal. */
const WEAK_TRAVEL =
  /\b(afternoon|morning|evening|weekend|today|tomorrow|what should we do|plan my|help plan)\b/i;

const PLACE_OR_FOOD =
  /\b(tokyo|osaka|kyoto|manila|cebu|bangkok|singapore|seoul|paris|london|rome|dubai|bali|restaurant|ramen|sushi|cafe|hotel)\b/i;

const OFF_TOPIC =
  /\b(homework|math|algebra|calculus|code this|write code|programming|python|javascript|react native|stock|crypto|bitcoin|nft|politics|election|dating advice|relationship advice|medical diagnosis|prescribe|lawsuit|legal advice|hack|exploit|weapon|bomb|nsfw|porn|gambling|casino|lottery)\b/i;

export type TravelScopeResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      rejectionMessage: string;
    };

const REJECTION =
  'I only help with travel: places, restaurants, hotels, routes, weather, budgets, and trip planning. Please ask something about your trip.';

export function evaluateTravelScope(question: string): TravelScopeResult {
  const text = question.trim();
  if (text.length < 2) {
    return {
      ok: false,
      reason: 'empty',
      rejectionMessage: 'Ask a travel question — places, food, routes, hotels, or trip plans.',
    };
  }

  const strong = STRONG_TRAVEL.test(text) || PLACE_OR_FOOD.test(text);
  const weak = WEAK_TRAVEL.test(text);
  const offTopic = OFF_TOPIC.test(text);

  if (offTopic && !strong) {
    return { ok: false, reason: 'off_topic', rejectionMessage: REJECTION };
  }

  if (strong || (weak && (strong || PLACE_OR_FOOD.test(text)))) {
    return { ok: true };
  }

  // "What should we do this afternoon?" — weak cue alone is OK for explore mode.
  if (weak && /\b(what should|things to do|plan)\b/i.test(text)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'out_of_scope',
    rejectionMessage:
      'That looks outside TravelAssistant’s scope. Try asking about nearby places, restaurants, hotels, directions, weather, or planning your trip.',
  };
}

export function isTravelScopedQuestion(question: string): boolean {
  return evaluateTravelScope(question).ok;
}
