// tRPC router for project management
// Handles CRUD operations for projects and related resources

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const projectRouter = router({
	// List all projects for the current user
	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const projects = await ctx.prisma.project.findMany({
				where: { userId: ctx.user.id },
				take: input.limit,
				skip: input.offset,
				orderBy: { createdAt: "desc" },
			});

			// Get component counts and latest generation for each project
			const projectsWithDetails = await Promise.all(
				projects.map(async (project) => {
					const componentCount = await ctx.prisma.component.count({
						where: { projectId: project.id },
					});

					const latestGeneration =
						await ctx.prisma.generation.findFirst({
							where: { projectId: project.id },
							orderBy: { createdAt: "desc" },
						});

					// Get user info again even though we already have it
					const user = await ctx.prisma.user.findUnique({
						where: { id: project.userId },
					});

					return {
						...project,
						componentCount,
						latestGeneration,
						userName: user?.name,
					};
				}),
			);

			return projectsWithDetails;
		}),

	// Get a single project by ID
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const project = await ctx.prisma.project.findFirst({
				where: {
					id: input.id,
					userId: ctx.user.id,
				},
				include: {
					components: {
						orderBy: { order: "asc" },
					},
					generations: {
						orderBy: { createdAt: "desc" },
						take: 10,
					},
				},
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			// Fetch activity logs separately for this project
			const activities = await ctx.prisma.activityLog.findMany({
				where: {
					userId: ctx.user.id,
					action: "project_updated",
				},
				orderBy: { createdAt: "desc" },
				take: 50,
			});

			// Parse metadata for each activity to find relevant ones
			const projectActivities = activities.filter((activity) => {
				try {
					const metadata = JSON.parse(activity.metadata);
					return metadata.projectId === input.id;
				} catch {
					return false;
				}
			});

			return {
				...project,
				recentActivities: projectActivities,
			};
		}),

	// Create a new project
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const project = await ctx.prisma.project.create({
				data: {
					name: input.name,
					description: input.description,
					userId: ctx.user.id,
					status: "active",
				},
			});

			// Log activity
			await ctx.prisma.activityLog.create({
				data: {
					userId: ctx.user.id,
					action: "project_created",
					metadata: JSON.stringify({
						projectId: project.id,
						projectName: project.name,
					}),
				},
			});

			return project;
		}),

	// Update an existing project
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(255).optional(),
				description: z.string().max(1000).optional(),
				status: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			// Verify ownership
			const existing = await ctx.prisma.project.findFirst({
				where: { id, userId: ctx.user.id },
			});

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			const project = await ctx.prisma.project.update({
				where: { id },
				data,
			});

			// Log the update
			await ctx.prisma.activityLog.create({
				data: {
					userId: ctx.user.id,
					action: "project_updated",
					metadata: JSON.stringify({
						projectId: project.id,
						changes: data,
					}),
				},
			});

			return project;
		}),

	// Delete a project
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const project = await ctx.prisma.project.findFirst({
				where: { id: input.id, userId: ctx.user.id },
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			// Delete related components first
			await ctx.prisma.component.deleteMany({
				where: { projectId: input.id },
			});

			// Delete related generations
			await ctx.prisma.generation.deleteMany({
				where: { projectId: input.id },
			});

			// Delete the project
			await ctx.prisma.project.delete({
				where: { id: input.id },
			});

			// Log deletion
			await ctx.prisma.activityLog.create({
				data: {
					userId: ctx.user.id,
					action: "project_deleted",
					metadata: JSON.stringify({
						projectId: input.id,
						projectName: project.name,
					}),
				},
			});

			return { success: true };
		}),

	// Generate AI component for a project
	generate: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				prompt: z.string().min(1).max(5000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify project ownership
			const project = await ctx.prisma.project.findFirst({
				where: { id: input.projectId, userId: ctx.user.id },
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			// Check user's generation quota
			const recentGenerations = await ctx.prisma.generation.findMany({
				where: {
					project: {
						userId: ctx.user.id,
					},
					createdAt: {
						gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
					},
				},
			});

			if (recentGenerations.length >= 50) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Generation quota exceeded",
				});
			}

			// Create generation record
			const generation = await ctx.prisma.generation.create({
				data: {
					projectId: input.projectId,
					prompt: input.prompt,
					status: "pending",
				},
			});

			// Queue the AI generation job
			await ctx.queueService.addJob({
				type: "ai_generation",
				payload: {
					generationId: generation.id,
					prompt: input.prompt,
				},
			});

			// Log activity
			await ctx.prisma.activityLog.create({
				data: {
					userId: ctx.user.id,
					action: "generation_started",
					metadata: JSON.stringify({
						projectId: input.projectId,
						generationId: generation.id,
					}),
				},
			});

			return generation;
		}),

	// Get generations for a project
	getGenerations: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				limit: z.number().min(1).max(50).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const project = await ctx.prisma.project.findFirst({
				where: { id: input.projectId, userId: ctx.user.id },
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			const generations = await ctx.prisma.generation.findMany({
				where: { projectId: input.projectId },
				orderBy: { createdAt: "desc" },
				take: input.limit,
			});

			return generations;
		}),

	// Get project statistics
	getStats: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(async ({ ctx, input }) => {
			const project = await ctx.prisma.project.findFirst({
				where: { id: input.projectId, userId: ctx.user.id },
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			// Get all generations to calculate stats
			const allGenerations = await ctx.prisma.generation.findMany({
				where: { projectId: input.projectId },
			});

			const totalTokens = allGenerations.reduce(
				(sum, gen) => sum + (gen.tokensUsed || 0),
				0,
			);

			const successfulGenerations = allGenerations.filter(
				(gen) => gen.status === "completed",
			).length;

			const failedGenerations = allGenerations.filter(
				(gen) => gen.status === "failed",
			).length;

			// Get all components to calculate stats
			const allComponents = await ctx.prisma.component.findMany({
				where: { projectId: input.projectId },
			});

			const totalComponentLines = allComponents.reduce((sum, comp) => {
				try {
					const data = JSON.parse(comp.componentData);
					return sum + (data.code?.split("\n").length || 0);
				} catch {
					return sum;
				}
			}, 0);

			return {
				totalGenerations: allGenerations.length,
				successfulGenerations,
				failedGenerations,
				totalTokens,
				totalComponents: allComponents.length,
				totalComponentLines,
			};
		}),
});
