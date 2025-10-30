// Home page - Project dashboard
// Displays user's projects and allows creating new ones

"use client";

import { AuthWrapper } from "@/components/auth-wrapper";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function HomePage() {
	const [isCreating, setIsCreating] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");
	const [newProjectDescription, setNewProjectDescription] = useState("");
	const router = useRouter();

	const utils = trpc.useUtils();

	const { data: projects, isLoading } = trpc.project.list.useQuery({
		limit: 20,
		offset: 0,
	});

	const createProject = trpc.project.create.useMutation({
		onSuccess: () => {
			utils.project.list.invalidate();
			setIsCreating(false);
			setNewProjectName("");
			setNewProjectDescription("");
		},
	});

	const handleCreateProject = (e: React.FormEvent) => {
		e.preventDefault();
		if (newProjectName.trim()) {
			createProject.mutate({
				name: newProjectName,
				description: newProjectDescription || undefined,
			});
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		router.push("/auth/login");
	};

	return (
		<AuthWrapper>
			<div className="container">
				<header className="header">
					<div>
						<h1>NoCode AI</h1>
						<p className="subtitle">
							Build applications with AI-powered code generation
						</p>
					</div>
					<button
						onClick={handleLogout}
						className="btn-secondary"
						style={{ alignSelf: "flex-start" }}
					>
						Logout
					</button>
				</header>

				<main>
					<div className="section-header">
						<h2>Your Projects</h2>
						<button
							onClick={() => setIsCreating(!isCreating)}
							className="btn-primary"
						>
							{isCreating ? "Cancel" : "+ New Project"}
						</button>
					</div>

					{isCreating && (
						<div className="create-form">
							<form onSubmit={handleCreateProject}>
								<div className="form-group">
									<label htmlFor="name">Project Name</label>
									<input
										id="name"
										type="text"
										value={newProjectName}
										onChange={(e) =>
											setNewProjectName(e.target.value)
										}
										placeholder="My Awesome App"
										required
									/>
								</div>

								<div className="form-group">
									<label htmlFor="description">
										Description (optional)
									</label>
									<textarea
										id="description"
										value={newProjectDescription}
										onChange={(e) =>
											setNewProjectDescription(
												e.target.value,
											)
										}
										placeholder="A brief description of your project..."
										rows={3}
									/>
								</div>

								<div className="form-actions">
									<button
										type="submit"
										className="btn-primary"
										disabled={createProject.isPending}
									>
										{createProject.isPending
											? "Creating..."
											: "Create Project"}
									</button>
								</div>
							</form>
						</div>
					)}

					{isLoading ? (
						<div className="loading">Loading projects...</div>
					) : projects && projects.length > 0 ? (
						<div className="projects-grid">
							{projects.map((project) => (
								<div key={project.id} className="project-card">
									<h3>{project.name}</h3>
									{project.description && (
										<p className="description">
											{project.description}
										</p>
									)}

									<div className="project-meta">
										<span
											className="status"
											data-status={project.status}
										>
											{project.status}
										</span>
										<span className="components">
											{project.componentCount} components
										</span>
									</div>

									{project.latestGeneration && (
										<div className="latest-generation">
											<small>
												Latest:{" "}
												{
													project.latestGeneration
														.status
												}
												{project.latestGeneration
													.completedAt && (
													<>
														{" "}
														•{" "}
														{new Date(
															project.latestGeneration.completedAt,
														).toLocaleDateString()}
													</>
												)}
											</small>
										</div>
									)}

									<div className="project-actions">
										<button className="btn-secondary">
											View
										</button>
										<button className="btn-secondary">
											Generate
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="empty-state">
							<p>
								No projects yet. Create your first project to
								get started!
							</p>
						</div>
					)}

					{createProject.error && (
						<div className="error-message">
							Error: {createProject.error.message}
						</div>
					)}
				</main>

				<footer className="footer">
					<p>NoCode AI - Technical Assessment</p>
					<p className="tech-stack">
						Next.js 15 • React 19 • tRPC • Prisma • Claude AI
					</p>
				</footer>
			</div>
		</AuthWrapper>
	);
}
