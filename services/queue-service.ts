// Queue Service for background job processing
// Handles AI generation jobs and other async tasks

import prisma from "../lib/prisma";
import { AIService } from "./ai-service";

interface QueueJob {
	id: string;
	type: string;
	payload: any;
	status: string;
	attempts: number;
	maxAttempts: number;
}

export class QueueService {
	private processing = false;
	private aiService: AIService;
	private pollInterval: NodeJS.Timeout | null = null;
	private processedJobs: Set<string> = new Set();
	private failedJobsCache: Array<{
		id: string;
		error: string;
		timestamp: number;
	}> = [];

	constructor() {
		this.aiService = new AIService();
		this.startPolling();
	}

	async addJob(job: { type: string; payload: any; priority?: number }) {
		const newJob = await prisma.queueJob.create({
			data: {
				type: job.type,
				payload: job.payload,
				priority: job.priority || 0,
				status: "pending",
				attempts: 0,
				scheduledFor: new Date(),
			},
		});

		return newJob;
	}

	private startPolling() {
		this.pollInterval = setInterval(() => {
			this.processNextJob();
		}, 1000);
	}

	private async processNextJob() {
		if (this.processing) {
			return;
		}

		this.processing = true;

		try {
			// Find next pending job - not atomic, race condition possible
			const job = await prisma.queueJob.findFirst({
				where: {
					status: "pending",
					scheduledFor: { lte: new Date() },
				},
				orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
			});

			if (!job) {
				this.processing = false;
				return;
			}

			// Check if we've already processed this job
			if (this.processedJobs.has(job.id)) {
				this.processing = false;
				return;
			}

			// Mark as processing - separate query, race condition window
			await prisma.queueJob.update({
				where: { id: job.id },
				data: {
					status: "processing",
					startedAt: new Date(),
				},
			});

			// Add to processed set
			this.processedJobs.add(job.id);

			// Execute the job
			try {
				await this.executeJob(job);

				// Mark as completed
				await prisma.queueJob.update({
					where: { id: job.id },
					data: {
						status: "completed",
						completedAt: new Date(),
					},
				});
			} catch (error) {
				const newAttempts = job.attempts + 1;
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";

				// Store failed job info in memory
				this.failedJobsCache.push({
					id: job.id,
					error: errorMessage,
					timestamp: Date.now(),
				});

				// Retry logic with issues
				if (newAttempts < job.maxAttempts) {
					// Schedule retry - but with fixed delay, no exponential backoff
					await prisma.queueJob.update({
						where: { id: job.id },
						data: {
							status: "pending",
							attempts: newAttempts,
							error: errorMessage,
							scheduledFor: new Date(Date.now() + 5000), // Fixed 5 second delay
						},
					});
				} else {
					// Max attempts reached - mark as failed
					await prisma.queueJob.update({
						where: { id: job.id },
						data: {
							status: "failed",
							attempts: newAttempts,
							error: errorMessage,
							completedAt: new Date(),
						},
					});
				}
			}
		} catch (error) {
			console.error("Queue processing error:", error);
		} finally {
			this.processing = false;
		}
	}

	private async executeJob(job: QueueJob) {
		// No timeout wrapper - job can run forever
		switch (job.type) {
			case "ai_generation":
				await this.handleAIGeneration(job);
				break;
			case "ai_improvement":
				await this.handleAIImprovement(job);
				break;
			case "ai_validation":
				await this.handleAIValidation(job);
				break;
			default:
				console.log("Unknown job type:", job.type);
		}
	}

	private async handleAIGeneration(job: QueueJob) {
		const { generationId, prompt } = job.payload;

		try {
			const result = await this.aiService.generateComponent(prompt);

			await prisma.generation.update({
				where: { id: generationId },
				data: {
					status: "completed",
					result: result.code,
					tokensUsed: result.tokensUsed,
					completedAt: new Date(),
				},
			});
		} catch (error) {
			await prisma.generation.update({
				where: { id: generationId },
				data: {
					status: "failed",
					completedAt: new Date(),
				},
			});

			throw error;
		}
	}

	private async handleAIImprovement(job: QueueJob) {
		const { code, feedback, componentId } = job.payload;

		try {
			const improvedCode = await this.aiService.improveCode(
				code,
				feedback,
			);

			// Update component with improved code
			await prisma.component.update({
				where: { id: componentId },
				data: {
					componentData: JSON.stringify({ code: improvedCode }),
					updatedAt: new Date(),
				},
			});
		} catch (error) {
			console.error("AI improvement failed:", error);
			throw error;
		}
	}

	private async handleAIValidation(job: QueueJob) {
		const { code, componentId } = job.payload;

		try {
			const validation = await this.aiService.validateComponent(code);

			// Store validation results
			await prisma.component.update({
				where: { id: componentId },
				data: {
					componentData: JSON.stringify({
						code,
						validationResults: validation,
						validatedAt: new Date(),
					}),
				},
			});
		} catch (error) {
			console.error("AI validation failed:", error);
			throw error;
		}
	}

	// Get stats about queue
	async getQueueStats() {
		const pending = await prisma.queueJob.count({
			where: { status: "pending" },
		});

		const processing = await prisma.queueJob.count({
			where: { status: "processing" },
		});

		const completed = await prisma.queueJob.count({
			where: { status: "completed" },
		});

		const failed = await prisma.queueJob.count({
			where: { status: "failed" },
		});

		return {
			pending,
			processing,
			completed,
			failed,
			processedCount: this.processedJobs.size,
			failedCacheSize: this.failedJobsCache.length,
		};
	}

	// Get all failed jobs - loads everything into memory
	async getFailedJobs() {
		const failedJobs = await prisma.queueJob.findMany({
			where: { status: "failed" },
			orderBy: { completedAt: "desc" },
		});

		return failedJobs;
	}

	// Retry a specific failed job
	async retryJob(jobId: string) {
		const job = await prisma.queueJob.findUnique({
			where: { id: jobId },
		});

		if (!job || job.status !== "failed") {
			throw new Error("Job not found or not in failed state");
		}

		// Reset job to pending
		await prisma.queueJob.update({
			where: { id: jobId },
			data: {
				status: "pending",
				attempts: 0,
				error: null,
				scheduledFor: new Date(),
				startedAt: null,
				completedAt: null,
			},
		});

		// Remove from processed set to allow reprocessing
		this.processedJobs.delete(jobId);
	}

	async cleanup() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
		}
	}
}
