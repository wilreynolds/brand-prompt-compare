# Prompt Engineering Guide

The quality of your brand perception insights depends entirely on the quality of your prompts. This guide covers what works, what doesn't, and why.

## The Core Principle

**Ask the question a buyer would actually ask.** Not the question your CEO wants tracked — the question a prospect types into ChatGPT at 10pm while evaluating vendors.

## What Makes a Good Comparison Prompt

### Be Specific About Dimensions

❌ "Compare Brand A vs Brand B"  
✅ "I'm evaluating Brand A and Brand B for enterprise data security. Compare their track record on breach response, compliance certifications, and customer data handling transparency."

Generic prompts produce generic praise. Specific dimensions produce differentiated scores.

### Ask for Evidence

❌ "Which is better, Brand A or Brand B?"  
✅ "Compare Brand A and Brand B on customer support quality. Cite specific examples, reviews, or reports that support your assessment."

Asking for evidence forces the LLM to ground its response in retrievable facts, which means the source verification pass has something to work with.

### Use Buyer Language, Not Marketer Language

❌ "Which brand has better thought leadership and brand equity?"  
✅ "I need to choose between Brand A and Brand B for my team. Which one do real users complain about less?"

Buyer prompts use plain language about real concerns. Marketer prompts use jargon that LLMs will reflect back without differentiation.

### Compare 2–3 Brands, Not More

The tool supports up to 3 brands per comparison. Two-brand comparisons produce the most focused results. Three-brand comparisons are useful for category mapping but dilute per-brand depth.

## Template Patterns That Work

### The Buyer Evaluation
```
I'm choosing between {brand1} and {brand2} for [use case]. Compare them on [dimension 1], [dimension 2], and [dimension 3]. Which would you recommend and why? Cite sources.
```

### The Switcher Question
```
I'm currently using {brand1} but considering switching to {brand2}. What would I gain and what would I lose? Be specific about features, pricing, and customer experience.
```

### The Category Perception Check
```
In the [industry] space, how do {brand1}, {brand2}, and {brand3} compare on [key buying criteria]? Which has the strongest reputation and why?
```

### The Objection Test
```
My team is leaning toward {brand1} over {brand2}. What are the strongest arguments against choosing {brand1}? What does {brand2} do better?
```

## Reading Your Results

### High Concept Score Variance = Useful Prompt
If Brand A scores 8/10 on Trust and Brand B scores 4/10, your prompt is revealing real perception differences. That's actionable.

### Low Variance Across All Concepts = Weak Prompt
If both brands score 6–7 on everything, the prompt is too vague. Try adding specific dimensions or asking for evidence.

### Model Disagreement = Signal Worth Investigating
If ChatGPT loves Brand A but Gemini prefers Brand B, that's not noise — it reflects different training data and recency. The disagreement itself is the insight.
