import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email } = body;

		if (!email || typeof email !== "string") {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 },
			);
		}

		// Find or create user
		let user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			// For the assessment, auto-create users
			user = await prisma.user.create({
				data: {
					email,
					name: email.split("@")[0],
				},
			});
		}

		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const session = await prisma.session.create({
			data: {
				userId: user.id,
				token,
				expiresAt,
			},
		});

		return NextResponse.json({
			token: session.token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
