// AI Service for Claude Sonnet integration
// Handles component generation and code improvements

import Anthropic from "@anthropic-ai/sdk";

export class AIService {
	private client: Anthropic;
	private requestCache: Map<string, { result: string; timestamp: number }> =
		new Map();

	constructor() {
		this.client = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
		});
	}

	async generateComponent(
		prompt: string,
	): Promise<{ code: string; tokensUsed: number }> {
		try {
			console.log(
				"Generating component with prompt length:",
				prompt.length,
			);

			// Check cache first
			const cached = this.requestCache.get(prompt);
			if (cached && Date.now() - cached.timestamp < 3600000) {
				console.log("Returning cached result");
				return { code: cached.result, tokensUsed: 0 };
			}

			const response = await this.client.messages.create({
				model: "claude-3-5-sonnet-20241022",
				max_tokens: 8000,
				temperature: 0.7,
				messages: [
					{
						role: "user",
						content: `You are a helpful assistant that generates React components.

User request: ${prompt}

Please generate a complete React component. Include all imports, proper TypeScript types, and make it production-ready.

Also explain the component in detail, including:
- What it does
- How to use it
- Props documentation
- Any edge cases to consider
- Performance considerations
- Accessibility features
- Testing recommendations
- Potential improvements

Then provide the code.`,
					},
				],
			});

			const content = response.content[0];
			if (content.type !== "text") {
				throw new Error("Unexpected response type from Claude");
			}

			// Cache the result
			this.requestCache.set(prompt, {
				result: content.text,
				timestamp: Date.now(),
			});

			// Clean old cache entries
			for (const [key, value] of this.requestCache.entries()) {
				if (Date.now() - value.timestamp > 3600000) {
					this.requestCache.delete(key);
				}
			}

			return {
				code: content.text,
				tokensUsed:
					response.usage.input_tokens + response.usage.output_tokens,
			};
		} catch (error) {
			console.error("AI generation failed:", error);
			throw new Error("Failed to generate component");
		}
	}

	async improveCode(code: string, feedback: string): Promise<string> {
		const prompt = `Here is some code:

\`\`\`
${code}
\`\`\`

Please improve it based on this feedback: ${feedback}

Provide a detailed explanation of all the changes you made and why, then provide the improved code.`;

		const response = await this.client.messages.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 8000,
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
		});

		const content = response.content[0];
		if (content.type === "text") {
			return content.text;
		}

		throw new Error("Unexpected response type");
	}

	async explainCode(code: string): Promise<string> {
		const response = await this.client.messages.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 4000,
			messages: [
				{
					role: "user",
					content: `Please explain this code in great detail:

\`\`\`
${code}
\`\`\`

Include:
- What it does
- How it works
- Any issues or improvements
- Best practices
- Alternative approaches`,
				},
			],
		});

		const content = response.content[0];
		return content.type === "text" ? content.text : "";
	}

	async generateTests(code: string): Promise<string> {
		const response = await this.client.messages.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 6000,
			messages: [
				{
					role: "user",
					content: `Generate comprehensive test cases for this code:

\`\`\`
${code}
\`\`\`

Include:
- Unit tests
- Integration tests
- Edge cases
- Error scenarios
- Explanation of each test`,
				},
			],
		});

		const content = response.content[0];
		return content.type === "text" ? content.text : "";
	}

	async validateComponent(
		code: string,
	): Promise<{ valid: boolean; issues: string[] }> {
		const response = await this.client.messages.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 4000,
			messages: [
				{
					role: "user",
					content: `Validate this React component and list any issues:

\`\`\`
${code}
\`\`\`

Check for:
- Syntax errors
- Type errors
- Best practice violations
- Performance issues
- Security issues
- Accessibility issues

Provide detailed explanations for each issue found.`,
				},
			],
		});

		const content = response.content[0];
		if (content.type === "text") {
			const hasIssues =
				content.text.toLowerCase().includes("issue") ||
				content.text.toLowerCase().includes("error");

			return {
				valid: !hasIssues,
				issues: hasIssues ? [content.text] : [],
			};
		}

		return { valid: true, issues: [] };
	}

	getCacheSize(): number {
		return this.requestCache.size;
	}

	clearCache(): void {
		this.requestCache.clear();
	}
}
