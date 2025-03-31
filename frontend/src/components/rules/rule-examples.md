# Rule Pattern Examples

When creating rules for transaction balancing, you can use regular expression patterns to match transaction descriptions. Here are some useful examples:

## Basic Patterns

### Simple Text Matching
To match transactions containing specific words:

- `grocery` - Matches descriptions with the word "grocery"
- `coffee|tea` - Matches descriptions with either "coffee" or "tea"
- `restaurant dinner` - Matches descriptions with both "restaurant" AND "dinner"

### Common Expense Categories

#### Groceries
- `(grocery|groceries|supermarket|market|whole foods|trader|safeway|kroger|publix|albertsons)`

#### Dining
- `(restaurant|dinner|lunch|cafe|dining|bistro|bar|grill|eatery)`

#### Utilities
- `(electric|electricity|gas|water|utility|utilities|bill payment|power)`

#### Transportation
- `(gas|fuel|uber|lyft|taxi|rideshare|transit|bus|subway|train|parking)`

#### Shopping
- `(amazon|walmart|target|costco|shopping|purchase|store|retail|outlet|mall)`

#### Entertainment
- `(movie|cinema|theater|concert|show|netflix|hulu|disney|subscription|entertainment)`

## Advanced Patterns

### Case Insensitive Matching
By default, patterns are case-insensitive, so `grocery` will match "Grocery", "GROCERY", etc.

### Partial Word Matching
- `mart` - Matches "Walmart", "Smart", "Mart", etc.
- To match only full words, use word boundaries: `\bmart\b`

### Beginning/End of Description
- `^walmart` - Matches descriptions that START with "walmart"
- `refund$` - Matches descriptions that END with "refund"

### Numeric Patterns
- `\d+\.99` - Matches prices ending in .99 (e.g., "9.99", "19.99")

## Testing Your Patterns

1. Create a new rule with your pattern
2. Go to the "Test" feature for that rule
3. Enter sample transaction descriptions
4. See if the pattern matches as expected

Remember, simpler patterns are easier to maintain. Start with basic patterns and make them more complex only if needed.

## Examples of Complete Rules

### Grocery Rule
- **Pattern**: `(grocery|groceries|supermarket|whole foods|trader|safeway)`
- **Source Account**: Credit Card
- **Destination Account**: Groceries Expense

### Dining Out Rule
- **Pattern**: `(restaurant|dining|cafe|bar|grill)`
- **Source Account**: Credit Card
- **Destination Account**: Dining Expense

### Utility Bill Rule
- **Pattern**: `(electric|gas|water|utility|bill payment)`
- **Source Account**: Checking Account
- **Destination Account**: Utilities Expense

### Income Rule
- **Pattern**: `(salary|paycheck|deposit)`
- **Source Account**: Checking Account
- **Destination Account**: Salary Income 