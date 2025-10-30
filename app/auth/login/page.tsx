"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Login failed");
			}

			const data = await response.json();

			// Store the token in localStorage
			localStorage.setItem("auth_token", data.token);

			// Redirect to home page
			router.push("/");
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
				<div>
					<h2 className="text-center text-3xl font-bold text-gray-900">
						Technical Assessment
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						NoCode AI Platform - Login
					</p>
				</div>

				<div className="bg-blue-50 border border-blue-200 rounded-md p-4">
					<p className="text-sm text-blue-800">
						<strong>Test Account:</strong>
						<br />
						Email: <code className="bg-blue-100 px-2 py-1 rounded">test@example.com</code>
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleLogin}>
					<div>
						<label htmlFor="email" className="block text-sm font-medium text-gray-700">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
							placeholder="Enter your email"
						/>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 rounded-md p-3">
							<p className="text-sm text-red-800">{error}</p>
						</div>
					)}

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Logging in..." : "Sign in"}
						</button>
					</div>
				</form>

				<div className="mt-4 text-center">
					<p className="text-xs text-gray-500">
						This is a test environment for the technical assessment.
					</p>
				</div>
			</div>
		</div>
	);
}
