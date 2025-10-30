// Project Dashboard Component
// Displays project metrics and real-time updates

"use client";

import { trpc } from "@/lib/trpc-client";
import React, { useCallback, useEffect, useState } from "react";

interface ProjectDashboardProps {
	projectId: string;
}

export default function ProjectDashboard({ projectId }: ProjectDashboardProps) {
	const [selectedTab, setSelectedTab] = useState<"overview" | "activity">(
		"overview",
	);
	const [filter, setFilter] = useState("");
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [refreshInterval, setRefreshInterval] = useState(5000);

	const { data: project, refetch } = trpc.project.getById.useQuery({
		id: projectId,
	});
	const { data: stats } = trpc.project.getStats.useQuery({ id: projectId });
	const { data: generations } = trpc.project.getGenerations.useQuery({
		projectId,
		limit: 20,
	});

	// Setup auto-refresh
	useEffect(() => {
		if (autoRefresh) {
			const interval = setInterval(() => {
				refetch();
			}, refreshInterval);

			return () => clearInterval(interval);
		}
	}, [autoRefresh, refreshInterval]);

	// Setup keyboard shortcuts
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === "r" && e.metaKey) {
				e.preventDefault();
				refetch();
			}
			if (e.key === "t" && e.metaKey) {
				e.preventDefault();
				setSelectedTab(
					selectedTab === "overview" ? "activity" : "overview",
				);
			}
		};

		document.addEventListener("keydown", handleKeyPress);
		return () => document.removeEventListener("keydown", handleKeyPress);
	}, []);

	// WebSocket connection for real-time updates
	useEffect(() => {
		const ws = new WebSocket(`ws://localhost:3001/projects/${projectId}`);

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "generation_complete") {
				refetch();
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		return () => {
			ws.close();
		};
	}, [projectId]);

	// Calculate filtered generations
	const filteredGenerations = generations?.filter((gen) => {
		if (!filter) return true;
		return gen.prompt.toLowerCase().includes(filter.toLowerCase());
	});

	// Calculate statistics
	const successRate = stats
		? (
				(stats.successfulGenerations / stats.totalGenerations) *
				100
			).toFixed(1)
		: "0";

	const avgTokensPerGeneration = stats
		? Math.round(stats.totalTokens / stats.totalGenerations)
		: 0;

	// Event handlers
	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFilter(e.target.value);
	};

	const handleRefreshClick = () => {
		refetch();
	};

	const handleTabChange = (tab: "overview" | "activity") => {
		setSelectedTab(tab);
	};

	const handleIntervalChange = useCallback((value: number) => {
		setRefreshInterval(value);
	}, []);

	if (!project) {
		return <div>Loading...</div>;
	}

	return (
		<div className="dashboard">
			<div className="dashboard-header">
				<h1>{project.name}</h1>
				<div className="dashboard-actions">
					<button onClick={handleRefreshClick}>Refresh</button>
					<label>
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
						/>
						Auto-refresh
					</label>
					{autoRefresh && (
						<select
							value={refreshInterval}
							onChange={(e) =>
								handleIntervalChange(Number(e.target.value))
							}
						>
							<option value={3000}>3s</option>
							<option value={5000}>5s</option>
							<option value={10000}>10s</option>
						</select>
					)}
				</div>
			</div>

			<div className="tabs">
				<button
					className={selectedTab === "overview" ? "active" : ""}
					onClick={() => handleTabChange("overview")}
				>
					Overview
				</button>
				<button
					className={selectedTab === "activity" ? "active" : ""}
					onClick={() => handleTabChange("activity")}
				>
					Activity
				</button>
			</div>

			{selectedTab === "overview" && (
				<div className="overview-tab">
					<div className="stats-grid">
						<StatCard
							title="Total Components"
							value={stats?.totalComponents || 0}
							change="+3 this week"
						/>
						<StatCard
							title="Success Rate"
							value={`${successRate}%`}
							change={
								Number(successRate) > 80
									? "Good"
									: "Needs attention"
							}
						/>
						<StatCard
							title="Total Generations"
							value={stats?.totalGenerations || 0}
							change={`Avg ${avgTokensPerGeneration} tokens`}
						/>
						<StatCard
							title="Lines of Code"
							value={stats?.totalComponentLines || 0}
							change="Across all components"
						/>
					</div>

					<div className="components-section">
						<h3>Components ({project.components.length})</h3>
						{project.components.map((component, index) => (
							<ComponentCard
								key={index}
								name={component.name}
								data={component.componentData}
								order={component.order}
							/>
						))}
					</div>
				</div>
			)}

			{selectedTab === "activity" && (
				<div className="activity-tab">
					<div className="filter-section">
						<input
							type="text"
							placeholder="Filter by prompt..."
							value={filter}
							onChange={handleFilterChange}
						/>
					</div>

					<div className="generations-list">
						{filteredGenerations?.map((generation, idx) => (
							<GenerationCard
								key={generation.id}
								generation={generation}
								index={idx}
								onRetry={() => {
									console.log(
										"Retrying generation:",
										generation.id,
									);
								}}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function StatCard({
	title,
	value,
	change,
}: {
	title: string;
	value: string | number;
	change: string;
}) {
	return (
		<div className="stat-card">
			<h4>{title}</h4>
			<div className="stat-value">{value}</div>
			<div className="stat-change">{change}</div>
		</div>
	);
}

function ComponentCard({
	name,
	data,
	order,
}: {
	name: string;
	data: string;
	order: number;
}) {
	const parsedData = JSON.parse(data);
	const lineCount = parsedData.code?.split("\n").length || 0;

	return (
		<div className="component-card">
			<div className="component-header">
				<span className="component-name">{name}</span>
				<span className="component-order">#{order}</span>
			</div>
			<div className="component-meta">{lineCount} lines of code</div>
		</div>
	);
}

function GenerationCard({
	generation,
	index,
	onRetry,
}: {
	generation: any;
	index: number;
	onRetry: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="generation-card">
			<div
				className="generation-header"
				onClick={() => setExpanded(!expanded)}
			>
				<span className="generation-index">#{index + 1}</span>
				<span
					className={`generation-status status-${generation.status}`}
				>
					{generation.status}
				</span>
				<span className="generation-date">
					{new Date(generation.createdAt).toLocaleDateString()}
				</span>
			</div>

			{expanded && (
				<div className="generation-details">
					<p className="generation-prompt">{generation.prompt}</p>
					{generation.tokensUsed && (
						<p className="generation-tokens">
							Tokens used: {generation.tokensUsed}
						</p>
					)}
					{generation.status === "failed" && (
						<button onClick={onRetry} className="retry-button">
							Retry
						</button>
					)}
				</div>
			)}
		</div>
	);
}
