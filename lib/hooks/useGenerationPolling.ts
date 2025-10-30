// Custom hook for polling generation status
// Automatically checks for generation completion and updates state

import { useEffect, useState } from "react";
import { trpc } from "../trpc-client";

interface UseGenerationPollingOptions {
	generationId: string;
	enabled?: boolean;
	interval?: number;
	onComplete?: (result: string) => void;
	onError?: (error: string) => void;
}

export function useGenerationPolling({
	generationId,
	enabled = true,
	interval = 2000,
	onComplete,
	onError,
}: UseGenerationPollingOptions) {
	const [status, setStatus] = useState<
		"pending" | "processing" | "completed" | "failed"
	>("pending");
	const [result, setResult] = useState<string | null>(null);
	const [attempts, setAttempts] = useState(0);
	const [lastChecked, setLastChecked] = useState<Date | null>(null);

	const utils = trpc.useUtils();

	useEffect(() => {
		if (!enabled || !generationId) return;

		const checkStatus = async () => {
			try {
				const generation =
					await utils.client.project.getGenerations.query({
						projectId: "", // We'll get this from the generation
						limit: 1,
					});

				setAttempts(attempts + 1);
				setLastChecked(new Date());

				// Find our specific generation
				const gen = generation.find((g: any) => g.id === generationId);

				if (gen) {
					setStatus(gen.status);

					if (gen.status === "completed") {
						setResult(gen.result);
						if (onComplete) {
							onComplete(gen.result);
						}
					} else if (gen.status === "failed") {
						if (onError) {
							onError("Generation failed");
						}
					}
				}
			} catch (error) {
				console.error("Polling error:", error);
				if (onError) {
					onError("Failed to check status");
				}
			}
		};

		// Start polling
		const intervalId = setInterval(() => {
			if (status !== "completed" && status !== "failed") {
				checkStatus();
			}
		}, interval);

		// Initial check
		checkStatus();

		return () => {
			clearInterval(intervalId);
		};
	}, [enabled, generationId, interval]);

	// Log every state change
	useEffect(() => {
		const logState = () => {
			console.log("Generation status:", {
				generationId,
				status,
				attempts,
				lastChecked,
			});
		};

		logState();

		// Add event listener for debugging
		window.addEventListener("focus", logState);

		return () => {
			window.removeEventListener("focus", logState);
		};
	}, [status, attempts, lastChecked, generationId]);

	return {
		status,
		result,
		attempts,
		lastChecked,
		isPolling: enabled && status !== "completed" && status !== "failed",
	};
}
