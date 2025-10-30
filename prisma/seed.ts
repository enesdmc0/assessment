// Database seeder - Populates the database with test data
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_PROMPTS = [
	"Create a button component with primary and secondary variants",
	"Build a responsive navigation bar with mobile menu",
	"Generate a card component for displaying user profiles",
	"Create a form component with validation",
	"Build a modal dialog component",
	"Generate a data table with sorting and pagination",
	"Create a dashboard layout component",
	"Build a sidebar navigation component",
	"Generate a hero section for landing page",
	"Create a pricing table component",
];

const COMPONENT_SAMPLES = [
	{
		name: "Button",
		code: "export function Button() { return <button>Click me</button> }",
	},
	{
		name: "Card",
		code: "export function Card() { return <div className='card'>Content</div> }",
	},
	{
		name: "Modal",
		code: "export function Modal() { return <dialog>Modal content</dialog> }",
	},
	{
		name: "Header",
		code: "export function Header() { return <header>Site Header</header> }",
	},
	{
		name: "Footer",
		code: "export function Footer() { return <footer>Footer</footer> }",
	},
];

async function main() {
	console.log("🌱 Starting database seed...");

	// Clean existing data
	console.log("🧹 Cleaning existing data...");
	await prisma.activityLog.deleteMany();
	await prisma.queueJob.deleteMany();
	await prisma.generation.deleteMany();
	await prisma.component.deleteMany();
	await prisma.project.deleteMany();
	await prisma.session.deleteMany();
	await prisma.user.deleteMany();

	// Create test users
	console.log("👤 Creating users...");
	const users = [];

	// Create main test user for login
	const testUser = await prisma.user.create({
		data: {
			email: "test@example.com",
			name: "Test User",
		},
	});
	users.push(testUser);

	// Create session for test user
	await prisma.session.create({
		data: {
			userId: testUser.id,
			token: "test-token-main",
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
		},
	});

	// Create additional test users
	for (let i = 1; i <= 2; i++) {
		const user = await prisma.user.create({
			data: {
				email: `user${i}@example.com`,
				name: `Test User ${i}`,
			},
		});
		users.push(user);

		// Create session for each user
		await prisma.session.create({
			data: {
				userId: user.id,
				token: `test-token-${i}`,
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
			},
		});
	}

	console.log(`✅ Created ${users.length} users`);

	// Create projects for each user
	console.log("📁 Creating projects...");
	let totalProjects = 0;
	let totalComponents = 0;
	let totalGenerations = 0;

	for (const user of users) {
		// Each user gets 5-8 projects
		const projectCount = 5 + Math.floor(Math.random() * 4);

		for (let i = 1; i <= projectCount; i++) {
			const project = await prisma.project.create({
				data: {
					name: `Project ${i} - ${user.name}`,
					description: `This is a test project for ${user.name}. It demonstrates ${
						[
							"e-commerce",
							"blog",
							"dashboard",
							"portfolio",
							"SaaS app",
						][Math.floor(Math.random() * 5)]
					} functionality.`,
					userId: user.id,
					status: ["active", "active", "active", "archived"][
						Math.floor(Math.random() * 4)
					], // 75% active
				},
			});
			totalProjects++;

			// Create components for each project
			const componentCount = 2 + Math.floor(Math.random() * 4); // 2-5 components
			for (let c = 0; c < componentCount; c++) {
				const sample =
					COMPONENT_SAMPLES[
						Math.floor(Math.random() * COMPONENT_SAMPLES.length)
					];
				await prisma.component.create({
					data: {
						projectId: project.id,
						name: `${sample.name}${c + 1}`,
						componentData: JSON.stringify({
							code: sample.code,
							lines: sample.code.split("\n").length,
							language: "tsx",
						}),
						order: c,
					},
				});
				totalComponents++;
			}

			// Create generations for each project
			const generationCount = 3 + Math.floor(Math.random() * 7); // 3-9 generations
			for (let g = 0; g < generationCount; g++) {
				const statusRoll = Math.random();
				let status = "completed";
				if (statusRoll < 0.1) status = "failed";
				else if (statusRoll < 0.15) status = "pending";
				else if (statusRoll < 0.2) status = "processing";

				const prompt =
					SAMPLE_PROMPTS[
						Math.floor(Math.random() * SAMPLE_PROMPTS.length)
					];
				const tokensUsed =
					status === "completed"
						? 500 + Math.floor(Math.random() * 3000)
						: null;

				await prisma.generation.create({
					data: {
						projectId: project.id,
						prompt,
						status,
						result:
							status === "completed"
								? `// Generated code for: ${prompt}\n\nexport function GeneratedComponent() {\n  return <div>Generated content</div>\n}`
								: null,
						tokensUsed,
						completedAt:
							status === "completed" || status === "failed"
								? new Date(
										Date.now() -
											Math.random() *
												7 *
												24 *
												60 *
												60 *
												1000,
									)
								: null,
					},
				});
				totalGenerations++;
			}

			// Create activity logs
			await prisma.activityLog.create({
				data: {
					userId: user.id,
					action: "project_created",
					metadata: JSON.stringify({
						projectId: project.id,
						projectName: project.name,
					}),
				},
			});
		}
	}

	console.log(`✅ Created ${totalProjects} projects`);
	console.log(`✅ Created ${totalComponents} components`);
	console.log(`✅ Created ${totalGenerations} generations`);

	// Create queue jobs
	console.log("⚙️  Creating queue jobs...");
	const queueJobCount = 15;
	for (let i = 0; i < queueJobCount; i++) {
		const statusRoll = Math.random();
		let status = "pending";
		if (statusRoll < 0.4) status = "completed";
		else if (statusRoll < 0.5) status = "failed";
		else if (statusRoll < 0.55) status = "processing";

		await prisma.queueJob.create({
			data: {
				type: ["ai_generation", "ai_improvement", "ai_validation"][
					Math.floor(Math.random() * 3)
				],
				payload: JSON.stringify({
					generationId:
						"gen_" + Math.random().toString(36).substring(7),
					prompt: SAMPLE_PROMPTS[
						Math.floor(Math.random() * SAMPLE_PROMPTS.length)
					],
				}),
				status,
				priority: Math.floor(Math.random() * 3),
				attempts:
					status === "failed" ? Math.floor(Math.random() * 3) + 1 : 0,
				error: status === "failed" ? "Rate limit exceeded" : null,
				scheduledFor: new Date(
					Date.now() - Math.random() * 60 * 60 * 1000,
				),
				startedAt:
					status !== "pending"
						? new Date(Date.now() - Math.random() * 30 * 60 * 1000)
						: null,
				completedAt:
					status === "completed" || status === "failed"
						? new Date(Date.now() - Math.random() * 20 * 60 * 1000)
						: null,
			},
		});
	}

	console.log(`✅ Created ${queueJobCount} queue jobs`);

	console.log("\n🎉 Database seeded successfully!");
	console.log("\n📊 Summary:");
	console.log(`   Users: ${users.length}`);
	console.log(`   Projects: ${totalProjects}`);
	console.log(`   Components: ${totalComponents}`);
	console.log(`   Generations: ${totalGenerations}`);
	console.log(`   Queue Jobs: ${queueJobCount}`);
	console.log("\n💡 Test credentials:");
	console.log(`   Email: user1@example.com`);
	console.log(`   Token: test-token-1`);
	console.log(`   (Use as: Authorization: Bearer test-token-1)`);
}

main()
	.catch((e) => {
		console.error("❌ Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
